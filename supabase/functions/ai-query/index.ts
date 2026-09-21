// AI 问答 Agent —— 处理自由提问
// 特性：时间范围过滤 + 增强上下文 + 宽松数值校验 + 规则引擎降级

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, json, bearer, callLLM, parseJsonAnswer } from '../_shared/llm.ts';

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

/** 解析时间范围：优先用前端传的 scope，否则从问题文本推断 */
function resolveScope(q: string, scopeParam?: string): { from: string | null; label: string } {
  // 前端显式传的 scope 优先
  if (scopeParam === 'today') return { from: fmtDate(new Date()), label: '今天' };
  if (scopeParam === 'week') return { from: weekStart(), label: '本周' };
  if (scopeParam === 'month') return { from: monthStart(), label: '本月' };
  if (scopeParam === 'all') return { from: null, label: '全部时间' };

  // 否则从问题文本推断
  if (/今天|今日/.test(q)) return { from: fmtDate(new Date()), label: '今天' };
  if (/本周|这周/.test(q)) return { from: weekStart(), label: '本周' };
  if (/本月|这个月/.test(q)) return { from: monthStart(), label: '本月' };
  if (/昨天|昨日/.test(q)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return { from: fmtDate(d), label: '昨天' };
  }
  return { from: null, label: '全部时间' };
}

/** 规则引擎兜底 */
function ruleAnswer(q: string, players: Row[], games: Row[], scores: Row[], sc: { from: string | null; label: string }) {
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

  // 个人战绩
  if (mentioned.length === 1 && /战绩|怎么样|表现|多少分|积分/.test(q)) {
    const p = mentioned[0];
    const s = stats[p.id];
    if (!s) return `${p.nickname}在${sc.label}没有对局记录。`;
    const winRate = s.games ? Math.round((s.wins / s.games) * 100) : 0;
    return `${sc.label}，${p.nickname}打了 ${s.games} 局，赢 ${s.wins} 局（胜率${winRate}%），总积分 ${signed(s.points)}。`;
  }

  // 两人对比
  if (mentioned.length === 2) {
    const [a, b] = mentioned;
    const sa = stats[a.id];
    const sb = stats[b.id];
    if (!sa || !sb) return `${sc.label}两人的记录不完整，无法对比。`;
    const lead = sa.points > sb.points ? a : b;
    const diff = Math.abs(sa.points - sb.points);
    return `${sc.label}，${a.nickname} ${signed(sa.points)}（${sa.games}局），${b.nickname} ${signed(sb.points)}（${sb.games}局），${lead.nickname}领先 ${diff} 分。`;
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
  if (/胜率/.test(q)) {
    const byRate = Object.entries(stats)
      .filter(([, s]) => s.games >= 2)
      .sort((x, y) => y[1].wins / y[1].games - x[1].wins / x[1].games);
    if (!byRate.length) return '对局数太少，还算不出有意义的胜率。';
    const [pid, s] = byRate[0];
    return `${sc.label}胜率最高的是 ${pm[pid]?.nickname || '未知'}，${Math.round((s.wins / s.games) * 100)}%（${s.games}局）。`;
  }
  if (/谁.*最.*打|打得最多|最勤|出场/.test(q)) {
    const byGames = Object.entries(stats).sort((a, b) => b[1].games - a[1].games);
    const [pid, s] = byGames[0];
    return `${sc.label}打得最多的是 ${pm[pid]?.nickname || '未知'}，${s.games} 局。`;
  }

  return '我没太理解这个问题。可以试试：今天谁赢最多 / 本周排名 / 某人战绩怎么样 / 一共打了几局 / 谁胜率最高';
}

/**
 * 宽松的数值校验：只校验"原始积分"类数值，放过百分比、排名等衍生数
 */
function numbersConsistent(text: string, scores: Row[]) {
  // 收集所有原始积分数值（包括绝对值）
  const rawPoints = new Set<number>();
  scores.forEach((s) => {
    rawPoints.add(s.points);
    rawPoints.add(Math.abs(s.points));
  });

  // 只检查带 +/- 前缀的数字（明确声称是原始积分的）
  // 不带前缀的数字视为衍生计算（总分、平均分、胜率等），不校验
  const found = text.match(/[+\\-]\\d+/g) || [];
  for (const raw of found) {
    const n = Number(raw);
    // 检查是否在原始数据中（允许±2 的误差，因为 LLM 可能四舍五入）
    let match = false;
    for (const rp of rawPoints) {
      if (Math.abs(rp - n) <= 2) {
        match = true;
        break;
      }
    }
    if (!match) {
      console.warn(`Number mismatch: ${n} not found in raw scores (tolerance ±2)`);
      return false;
    }
  }
  return true;
});

  // 只检查看起来像"积分"的数字（带+/-号或较大数值）
  // 百分比、排名等小数字不校验
  const found = text.match(/[+-]?\d{2,}/g) || [];
  for (const raw of found) {
    const n = Number(raw.replace('+', ''));
    // 大于10的数字才需要校验（排除排名、百分比等）
    if (Math.abs(n) > 10 && !rawPoints.has(n) && !rawPoints.has(Math.abs(n))) {
      return false;
    }
  }
  return true;
}

/** 构建增强的数据上下文 */
function buildContext(players: Row[], games: Row[], scores: Row[], sc: { from: string | null; label: string }) {
  const pm: Record<string, string> = {};
  players.forEach((p) => { pm[p.id] = p.nickname; });

  // 按时间范围过滤
  const validGames = sc.from ? games.filter((g) => g.played_date >= sc.from!) : games;
  const gameIds = new Set(validGames.map((g) => g.id));
  const validScores = scores.filter((s) => gameIds.has(s.game_id));

  const stats: Record<string, { points: number; games: number; wins: number }> = {};
  validScores.forEach((s) => {
    if (!stats[s.player_id]) stats[s.player_id] = { points: 0, games: 0, wins: 0 };
    stats[s.player_id].points += s.points;
    stats[s.player_id].games += 1;
    if (s.result === 'win') stats[s.player_id].wins += 1;
  });

  const lines = [
    `今天是 ${fmtDate(new Date())}，本周起始 ${weekStart()}。`,
    `查询范围：${sc.label}`,
    `${sc.label}共 ${validGames.length} 局。`,
    '',
    '## 玩家战绩',
  ];

  Object.entries(stats)
    .sort((a, b) => b[1].points - a[1].points)
    .forEach(([pid, s]) => {
      const winRate = s.games ? Math.round((s.wins / s.games) * 100) : 0;
      const avgPoints = s.games ? Math.round(s.points / s.games) : 0;
      lines.push(`- ${pm[pid] || '未知'}：总积分 ${signed(s.points)}，${s.games} 局，胜 ${s.wins} 局，胜率 ${winRate}%，场均 ${signed(avgPoints)}`);
    });

  // 最近对局（最多15局，比之前多）
  const recent = [...validGames].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 15);
  if (recent.length) {
    lines.push('', '## 最近对局');
    recent.forEach((g) => {
      const detail = validScores
        .filter((s) => s.game_id === g.id)
        .map((s) => `${pm[s.player_id] || '未知'} ${signed(s.points)}`)
        .join('，');
      lines.push(`- ${g.played_date}：${detail}`);
    });
  }

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

  const scopeParam = typeof body.scope === 'string' ? body.scope : undefined;

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

  const sc = resolveScope(question, scopeParam);
  const fallback = ruleAnswer(question, players, games, scores, sc);
  const context = buildContext(players, games, scores, sc);

  // 尝试 LLM
  const raw = await callLLM([
    {
      role: 'system',
      content: `你是"牌桌风云"麻将战绩助手的 AI Agent。

## 核心职责
基于给定的战绩数据回答用户问题。

## 回答规则
- 所有原始数字（积分、局数）必须来自给定数据，不得编造
- 你可以计算衍生数据：胜率、平均分、排名差等
- 回答简洁，1-2 句话
- 使用中文，语气友好自然，像朋友聊天
- 可以用麻将术语（手气、转运、翻盘等）
- 如果数据不足以回答，坦诚说明，不要瞎猜

## 输出格式
只输出 JSON，不要代码块包裹：
{"answer":"回答文本","confident":true}

如果数据不足以回答，confident 设为 false，并在 answer 中说明原因。`
    },
    {
      role: 'user',
      content: `## 数据上下文
${context}

## 用户问题
${question}

请基于以上数据回答问题。`
    }
  ]);

  if (raw) {
    const parsed = parseJsonAnswer(raw);
    if (parsed?.answer) {
      // 宽松校验：只查大数字
      const validScores = sc.from
        ? scores.filter((s) => games.filter((g) => g.played_date >= sc.from!).some((g) => g.id === s.game_id))
        : scores;
      if (numbersConsistent(parsed.answer, validScores)) {
        return json({ answer: parsed.answer, source: 'llm' });
      }
      console.warn('LLM number mismatch, falling back to rule engine');
      return json({ answer: fallback, source: 'rule', note: 'llm_number_mismatch' });
    }
  }

  return json({ answer: fallback, source: 'rule' });
});
