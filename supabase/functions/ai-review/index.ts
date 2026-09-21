// AI 对战点评 —— 专门处理 Leaderboard 页面的点评需求
// 输入：前端已算好的结构化战绩数据
// 输出：轻松幽默的点评文本
// 不做数值校验（数据本身就是前端算好的）

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, json, bearer, callLLM } from '../_shared/llm.ts';

type PlayerStats = {
  player_id: string;
  nickname: string;
  points: number;
  games: number;
  wins?: number;
};

type ReviewInput = {
  scopeLabel: string;
  tableCount: number;
  totalGames: number;
  players: PlayerStats[];
};

/** 规则引擎兜底点评 */
function ruleReview(input: ReviewInput): string {
  const { scopeLabel, tableCount, totalGames, players } = input;
  if (!players.length) return `${scopeLabel}没有对局记录，先攒几局再来找我点评。`;

  const sorted = [...players].sort((a, b) => b.points - a.points);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const parts: string[] = [];

  parts.push(`${scopeLabel}共 ${tableCount} 桌 ${totalGames} 局。`);

  if (top.points > 0) {
    parts.push(`${top.nickname}手气正佳，斩获 +${top.points} 分。`);
  }
  if (bottom.points < 0 && bottom.player_id !== top.player_id) {
    parts.push(`${bottom.nickname}略有不顺，${bottom.points} 分，下把转运。`);
  }

  // 找出局数最多的人
  const mostGames = [...players].sort((a, b) => b.games - a.games)[0];
  if (mostGames.games > 2) {
    parts.push(`${mostGames.nickname}出战最勤，打了 ${mostGames.games} 局。`);
  }

  return parts.join('');
}

/** 构建点评 prompt */
function buildReviewPrompt(input: ReviewInput): Array<{ role: string; content: string }> {
  const { scopeLabel, tableCount, totalGames, players } = input;
  const sorted = [...players].sort((a, b) => b.points - a.points);

  const playerLines = sorted.map((p) => {
    const sign = p.points > 0 ? '+' : '';
    let line = `- ${p.nickname}：${sign}${p.points}分，${p.games}局`;
    if (p.wins !== undefined && p.wins > 0) {
      const winRate = p.games ? Math.round((p.wins / p.games) * 100) : 0;
      line += `，赢${p.wins}局(胜率${winRate}%)`;
    }
    return line;
  }).join('\n');

  return [
    {
      role: 'system',
      content: `你是"牌桌风云"麻将战绩助手的 AI 点评员。

## 任务
根据给定的战绩数据，用轻松幽默、接地气的语气点评玩家表现。

## 风格要求
- 像朋友间聊天，不要官方腔
- 可以用麻将术语（手气、转运、翻盘、点炮、自摸等）
- 夸赢家要有趣不油腻，安慰输家要幽默不扎心
- 2-4 句话，简洁有力
- 可以点名 1-2 个表现突出的人重点说

## 输出格式
只输出 JSON，不要代码块包裹：
{"answer":"点评文本"}`
    },
    {
      role: 'user',
      content: `${scopeLabel}战绩：共 ${tableCount} 桌 ${totalGames} 局。

各玩家表现：
${playerLines}

请点评一下大家的表现。`
    }
  ];
}

function parseJsonAnswer(raw: string): { answer: string } | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    if (typeof obj.answer !== 'string') return null;
    return { answer: obj.answer };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = bearer(req);
  if (!token) return json({ error: '未登录' }, 401);

  // 验证登录态
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return json({ error: 'Server misconfigured' }, 500);

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

  const input: ReviewInput = {
    scopeLabel: typeof body.scopeLabel === 'string' ? body.scopeLabel : '全部',
    tableCount: typeof body.tableCount === 'number' ? body.tableCount : 0,
    totalGames: typeof body.totalGames === 'number' ? body.totalGames : 0,
    players: Array.isArray(body.players) ? body.players : []
  };

  if (!input.players.length) {
    return json({ answer: '没有对局数据，先记录几局再来找我点评。', source: 'rule' });
  }

  const fallback = ruleReview(input);

  // 尝试 LLM
  const messages = buildReviewPrompt(input);
  const raw = await callLLM(messages);

  if (raw) {
    const parsed = parseJsonAnswer(raw);
    if (parsed?.answer) {
      return json({ answer: parsed.answer, source: 'llm' });
    }
    // LLM 返回了但不是 JSON 格式 —— 直接用原文（可能是纯文本点评）
    if (raw.length < 500) {
      return json({ answer: raw.trim(), source: 'llm' });
    }
  }

  return json({ answer: fallback, source: 'rule' });
});
