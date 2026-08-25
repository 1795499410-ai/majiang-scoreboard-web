// AI 查询 —— 三级降级：LLM → 规则引擎 → 建议（D-006）
// 强制机制：输出格式约束 + 数值一致性校验 + 失败回退模板
//
// LLM 供应商：Agnes AI（OpenAI 兼容网关）。
// Key 一律从 Function Secrets 读取，不入代码库 —— 本仓库为公开仓库。
// 配置：Supabase Dashboard → Edge Functions → Secrets 设置 LLM_API_KEY。
// 未配置时 callLLM 直接返回 null，自动降级到规则引擎，功能不中断。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const LLM_DEFAULTS = {
  baseUrl: 'https://apihub.agnes-ai.cn/v1',
  model: 'agnes-2.0-flash'
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function bearer(req: Request) {
  const h = req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

type Row = Record<string, any>;

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekStart() {
  const now = new Date();
  const dow = now.getDay() || 7;
  const s = new Date(now);
  s.setDate(now.getDate() - dow + 1);
  return fmtDate(s);
}

function monthStart() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
}

function signed(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

function scopeOf(q: string) {
  if (/今天|今日/.test(q)) return { from: fmtDate(new Date()), label: '今天' };
  if (/本周|这周/.test(q)) return { from: weekStart(), label: '本周' };
  if (/本月|这个月/.test(q)) return { from: monthStart(), label: '本月' };
  return { from: null as string | null, label: '全部时间' };
}

/** 规则引擎兜底 —— 与前端 rules.js 保持同口径 */
function ruleAnswer(q: string, players: Row[], games: Row[], scores: Row[]) {
  const sc = scopeOf(q);
  const valid = sc.from ? games.filter((g) => g.played_date >= sc.from!) : games;
  const ids = new Set(valid.map((g) => g.id));
  const rows = scores.filter((s) => ids.has(s.game_id));
  if (!rows.length) return `${sc.label}没有对局记录。`;

  const pm: Record<string, Row> = {};
  players.forEach((p) => { pm[p.id] = p; });

  const stats: Record<string, { points: number; games: number; wins: number }> = {};
  rows.forEach((s) => {
    if (!stats[s.player_id]) stats[s.player_id] = { points: 0, games: 0, wins: 0 };
    stats[s.player_id].points += s.points;
    stats[s.player_id].games += 1;
    if (s.result === 'win') stats[s.player_id].wins += 1;
  });

  const mentioned = players.filter((p) => p.nickname && q.includes(p.nickname));
  const sorted = Object.entries(stats).sort((a, b) => b[1].points - a[1].points);

  if (mentioned.length === 1 && /战绩|怎么样|表现|多少分|积分/.test(q)) {
    const p = mentioned[0];
    const s = stats[p.id];
    if (!s) return `${p.nickname}在${sc.label}没有对局记录。`;
    return `${sc.label}，${p.nickname}打了 ${s.games} 局，赢 ${s.wins} 局，总积分 ${signed(s.points)}。`;
  }
  if (/谁赢|赢最多|第一|最高/.test(q)) {
    const [pid, s] = sorted[0];
    return `${sc.label}积分最高的是 ${pm[pid]?.nickname || '未知'}，${signed(s.points)}（${s.games}局）。`;
  }
  if (/谁输|输最多|垫底|最低/.test(q)) {
    const [pid, s] = sorted[sorted.length - 1];
    return `${sc.label}积分最低的是 ${pm[pid]?.nickname || '未知'}，${signed(s.points)}（${s.games}局）。`;
  }
  if (/几局|多少局|局数/.test(q)) {
    if (mentioned.length === 1) {
      return `${sc.label}，${mentioned[0].nickname}打了 ${stats[mentioned[0].id]?.games ?? 0} 局。`;
    }
    return `${sc.label}一共打了 ${valid.length} 局。`;
  }
  if (/排名|排行|前三|榜单/.test(q)) {
    const top = sorted.slice(0, 3).map(([pid, s], i) => `第${i + 1}名 ${pm[pid]?.nickname || '未知'} ${signed(s.points)}`);
    return `${sc.label}排名：${top.join('、')}。`;
  }
  return '我没太理解这个问题。可以试试：今天谁赢最多 / 本周排名 / 某人战绩怎么样';
}

/**
 * 数值一致性校验（D-006 强制机制）
 * 话术里出现的每个数字都必须能在结果集中找到，否则判定幻觉
 */
function numbersConsistent(text: string, allowed: Set<number>) {
  const found = text.match(/-?\d+/g) || [];
  for (const raw of found) {
    const n = Number(raw);
    // 百分比与小整数（局数等）容忍范围由 allowed 决定
    if (!allowed.has(n) && !allowed.has(Math.abs(n))) return false;
  }
  return true;
}

function buildAllowed(players: Row[], games: Row[], scores: Row[]) {
  const set = new Set<number>();
  // 名次、局数、人数这类小整数天然会出现在话术里，全量放行
  for (let i = 0; i <= 100; i++) set.add(i);

  const byPlayer: Record<string, { points: number; games: number; wins: number }> = {};
  // 按时间范围分别聚合，避免「今天 X 分」被全量累计值挡下判成幻觉
  const scopes: Record<string, Record<string, { points: number; games: number; wins: number }>> = {
    all: {}, today: {}, week: {}, month: {}
  };
  const today = fmtDate(new Date());
  const ws = weekStart();
  const ms = monthStart();
  const gameDate: Record<string, string> = {};
  games.forEach((g) => { gameDate[g.id] = String(g.played_date); });

  scores.forEach((s) => {
    set.add(s.points);
    set.add(Math.abs(s.points));

    const d = gameDate[s.game_id] || '';
    const buckets = ['all'];
    if (d && d >= today) buckets.push('today');
    if (d && d >= ws) buckets.push('week');
    if (d && d >= ms) buckets.push('month');

    for (const b of buckets) {
      const m = scopes[b];
      if (!m[s.player_id]) m[s.player_id] = { points: 0, games: 0, wins: 0 };
      m[s.player_id].points += s.points;
      m[s.player_id].games += 1;
      if (s.result === 'win') m[s.player_id].wins += 1;
    }
  });
  Object.assign(byPlayer, scopes.all);

  for (const m of Object.values(scopes)) {
    Object.values(m).forEach((s) => {
      set.add(s.points); set.add(Math.abs(s.points));
      set.add(s.games); set.add(s.wins);
      set.add(s.games - s.wins);
      if (s.games) set.add(Math.round((s.wins / s.games) * 100));
    });
    // 分差也是合理表述（「领先 12 分」）
    const pts = Object.values(m).map((s) => s.points);
    for (const a of pts) {
      for (const b of pts) set.add(Math.abs(a - b));
    }
  }

  set.add(games.length);
  set.add(players.length);
  set.add(games.filter((g) => String(g.played_date) >= today).length);
  set.add(games.filter((g) => String(g.played_date) >= ws).length);
  set.add(games.filter((g) => String(g.played_date) >= ms).length);

  // 年月日会出现在日期里
  games.forEach((g) => {
    const [y, m, d] = String(g.played_date).split('-').map(Number);
    set.add(y); set.add(m); set.add(d);
  });
  return set;
}

/**
 * 每用户限流。Edge Function 实例内存态，实例回收即重置 —— 挡不住分布式刷，
 * 但足以拦住单用户连点快捷指令造成的意外放量。
 */
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();

function rateLimited(userId: string) {
  const now = Date.now();
  const hits = (rateBuckets.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    rateBuckets.set(userId, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(userId, hits);
  if (rateBuckets.size > 500) {
    for (const [k, v] of rateBuckets) {
      if (!v.some((t) => now - t < RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return false;
}

/**
 * 容错解析模型输出。
 * 不假定网关一定支持 response_format：模型可能返回裸 JSON、
 * 包在 ```json 代码块里的 JSON，甚至直接一句话。三种都要能吃下。
 */
function parseAnswer(raw: string): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;

  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(stripped.slice(start, end + 1));
      if (typeof parsed.answer === 'string' && parsed.answer.trim()) {
        // confident 显式为 false 才判定为「数据不足」，缺字段按可用处理
        if (parsed.confident === false) return null;
        return parsed.answer.trim();
      }
    } catch {
      // 落到纯文本分支
    }
  }

  // 纯文本兜底：拒答类回复直接判失败，交给规则引擎
  if (/无法回答|数据不足|不知道|抱歉/.test(stripped)) return null;
  if (stripped.length > 300) return null;
  return stripped;
}

async function callLLM(q: string, context: string) {
  const apiKey = Deno.env.get('LLM_API_KEY');
  if (!apiKey) return null; // 未配置 secret 时静默降级到规则引擎
  const baseUrl = Deno.env.get('LLM_BASE_URL') || LLM_DEFAULTS.baseUrl;
  const model = Deno.env.get('LLM_MODEL') || LLM_DEFAULTS.model;

  // Agnes 免费额度延迟波动大（实测 2.6s~13s），12s 会把本可成功的请求砍掉。
  // 放宽到 20s：宁可多等，也好过退化成规则引擎的机械话术。
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content:
              '你是战绩数据助手。只能依据给定数据回答，禁止推测或编造任何数字。' +
              '所有数字必须直接来自数据。回答简洁，一到两句话，中文。' +
              '只输出 JSON，不要代码块包裹，不要额外说明：' +
              '{"answer":"回答文本","confident":true}。' +
              '如果数据不足以回答，confident 设为 false。'
          },
          { role: 'user', content: `数据：\n${context}\n\n问题：${q}` }
        ]
      })
    });
    if (!res.ok) {
      console.error('llm_http_error', res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    return parseAnswer(raw);
  } catch (e) {
    console.error('llm_exception', String(e).slice(0, 200));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildContext(players: Row[], games: Row[], scores: Row[]) {
  const pm: Record<string, string> = {};
  players.forEach((p) => { pm[p.id] = p.nickname; });

  const stats: Record<string, { points: number; games: number; wins: number }> = {};
  scores.forEach((s) => {
    if (!stats[s.player_id]) stats[s.player_id] = { points: 0, games: 0, wins: 0 };
    stats[s.player_id].points += s.points;
    stats[s.player_id].games += 1;
    if (s.result === 'win') stats[s.player_id].wins += 1;
  });

  const lines = [`今天是 ${fmtDate(new Date())}，本周起始 ${weekStart()}。`, `总对局 ${games.length} 局。`];
  lines.push('累计战绩：');
  Object.entries(stats)
    .sort((a, b) => b[1].points - a[1].points)
    .forEach(([pid, s]) => {
      lines.push(`- ${pm[pid] || '未知'}：总积分 ${signed(s.points)}，${s.games} 局，胜 ${s.wins} 局，胜率 ${s.games ? Math.round((s.wins / s.games) * 100) : 0}%`);
    });

  const recent = [...games].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 20);
  lines.push('最近对局：');
  recent.forEach((g) => {
    const detail = scores
      .filter((s) => s.game_id === g.id)
      .map((s) => `${pm[s.player_id] || '未知'} ${signed(s.points)}`)
      .join('，');
    lines.push(`- ${g.played_date}：${detail}`);
  });
  return lines.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return json({ error: 'Server misconfigured' }, 500);

  const token = bearer(req);
  if (!token) return json({ error: '未登录' }, 401);

  // 用调用者的 JWT 建 client，RLS 自动把查询限定在该用户数据内
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: userData, error: userErr } = await client.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: '登录已失效，请重新登录' }, 401);

  if (rateLimited(userData.user.id)) {
    return json({ answer: '问得太快了，歇一口气再问。', source: 'rate-limit' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) return json({ error: '问题不能为空' }, 400);
  if (question.length > 200) return json({ error: '问题过长' }, 400);

  const [pr, gr, sr] = await Promise.all([
    client.from('players').select('id,nickname').eq('status', 'active'),
    client.from('games').select('id,played_date,created_at'),
    client.from('scores').select('game_id,player_id,points,result')
  ]);
  if (pr.error || gr.error || sr.error) return json({ error: '数据读取失败' }, 500);

  const players = pr.data || [];
  const games = gr.data || [];
  const scores = sr.data || [];

  const fallback = ruleAnswer(question, players, games, scores);

  if (!games.length) {
    return json({ answer: '还没有任何对局记录，先记录几局再来问我。', source: 'rule' });
  }

  const llm = await callLLM(question, buildContext(players, games, scores));
  if (llm) {
    const allowed = buildAllowed(players, games, scores);
    if (numbersConsistent(llm, allowed)) {
      return json({ answer: llm, source: 'llm' });
    }
    // 数字对不上 = 判定幻觉，回退规则引擎
    return json({ answer: fallback, source: 'rule', note: 'llm_number_mismatch' });
  }

  return json({ answer: fallback, source: 'rule' });
});
