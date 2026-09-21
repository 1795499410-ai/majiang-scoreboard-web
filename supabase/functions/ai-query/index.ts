// AI 查询 Agent —— DeepSeek 驱动
// 功能：战绩数据问答 + 对局点评
// 特性：数值校验 + 规则引擎降级 + 幽默点评

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const LLM_CONFIG = {
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  apiKey: Deno.env.get('LLM_API_KEY') || ''
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

/** 规则引擎兜底 */
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

/** 数值一致性校验 */
function numbersConsistent(text: string, allowed: Set<number>) {
  const found = text.match(/-?\d+/g) || [];
  for (const raw of found) {
    const n = Number(raw);
    if (!allowed.has(n) && !allowed.has(Math.abs(n))) return false;
  }
  return true;
}

function buildAllowed(players: Row[], games: Row[], scores: Row[]) {
  const allowed = new Set<number>();
  players.forEach((p) => allowed.add(p.id.length));
  games.forEach((g) => {
    allowed.add(g.id.length);
    const d = new Date(g.created_at);
    allowed.add(d.getFullYear());
    allowed.add(d.getMonth() + 1);
    allowed.add(d.getDate());
  });
  scores.forEach((s) => {
    allowed.add(s.points);
    allowed.add(Math.abs(s.points));
  });
  return allowed;
}

function parseAnswer(raw: string): { answer: string; confident: boolean } | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    if (typeof obj.answer !== 'string') return null;
    return { answer: obj.answer, confident: obj.confident !== false };
  } catch {
    return null;
  }
}

/** 调用 DeepSeek API */
async function callLLM(q: string, context: string): Promise<string | null> {
  if (!LLM_CONFIG.apiKey) {
    console.warn('LLM_API_KEY not configured, falling back to rule engine');
    return null;
  }

  const timer = setTimeout(() => {}, 15000);

  try {
    const res = await fetch(`${LLM_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `你是"牌桌风云"麻将战绩助手的 AI Agent。

## 核心职责
1. **战绩问答**：基于给定数据回答用户问题，必须严格依据数据，禁止编造数字
2. **对局点评**：用轻松幽默的语气点评玩家表现，2-3 句话

## 回答规则
- 所有数字必须来自给定数据，不得推测或编造
- 回答简洁，1-2 句话（问答）或 2-3 句话（点评）
- 使用中文，语气友好
- 如果数据不足以回答，明确说明

## 输出格式
只输出 JSON，不要代码块包裹，不要额外说明：
{"answer":"回答文本","confident":true}

如果数据不足以回答，confident 设为 false。`
          },
          {
            role: 'user',
            content: `## 数据上下文
${context}

## 用户问题
${q}

请基于以上数据回答问题。`
          }
        ]
      })
    });

    if (!res.ok) {
      console.error('LLM HTTP error:', res.status, await res.text().then(t => t.slice(0, 200)));
      return null;
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = parseAnswer(raw);
    return parsed?.answer || null;
  } catch (e) {
    console.error('LLM exception:', String(e).slice(0, 200));
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

  const lines = [
    `今天是 ${fmtDate(new Date())}，本周起始 ${weekStart()}。`,
    `总对局 ${games.length} 局。`,
    '',
    '## 累计战绩',
  ];
  
  Object.entries(stats)
    .sort((a, b) => b[1].points - a[1].points)
    .forEach(([pid, s]) => {
      const winRate = s.games ? Math.round((s.wins / s.games) * 100) : 0;
      lines.push(`- ${pm[pid] || '未知'}：总积分 ${signed(s.points)}，${s.games} 局，胜 ${s.wins} 局，胜率 ${winRate}%`);
    });

  const recent = [...games].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 10);
  lines.push('', '## 最近对局');
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

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: userData, error: userErr } = await client.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: '登录已失效，请重新登录' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) return json({ error: '问题不能为空' }, 400);
  if (question.length > 500) return json({ error: '问题过长' }, 400);

  const [pr, gr, sr] = await Promise.all([
    client.from('players').select('id,nickname').eq('status', 'active'),
    client.from('games').select('id,played_date,created_at'),
    client.from('scores').select('game_id,player_id,points,result')
  ]);

  if (pr.error || gr.error || sr.error) {
    console.error('DB error:', pr.error || gr.error || sr.error);
    return json({ error: '数据读取失败' }, 500);
  }

  const players = pr.data || [];
  const games = gr.data || [];
  const scores = sr.data || [];

  if (!games.length) {
    return json({ answer: '还没有任何对局记录，先记录几局再来问我。', source: 'rule' });
  }

  const fallback = ruleAnswer(question, players, games, scores);
  const context = buildContext(players, games, scores);

  const llm = await callLLM(question, context);
  
  if (llm) {
    const allowed = buildAllowed(players, games, scores);
    if (numbersConsistent(llm, allowed)) {
      return json({ answer: llm, source: 'llm' });
    }
    console.warn('LLM number mismatch, falling back to rule engine');
    return json({ answer: fallback, source: 'rule', note: 'llm_number_mismatch' });
  }

  return json({ answer: fallback, source: 'rule' });
});
