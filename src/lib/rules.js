/**
 * 本地规则引擎 —— AI 三级降级的第二级（D-006）
 * LLM 不可用时由它兜底，保证「绝不空手而归」
 */
import { formatDate, weekStart, monthStart, signed } from './model';

function scopeOf(q) {
  if (/今天|今日/.test(q)) return { from: formatDate(), label: '今天' };
  if (/本周|这周/.test(q)) return { from: weekStart(), label: '本周' };
  if (/本月|这个月/.test(q)) return { from: monthStart(), label: '本月' };
  return { from: null, label: '全部时间' };
}

function aggregate(scores) {
  const m = {};
  scores.forEach((s) => {
    if (!m[s.player_id]) m[s.player_id] = { points: 0, games: 0, wins: 0 };
    m[s.player_id].points += s.points;
    m[s.player_id].games += 1;
    if (s.result === 'win') m[s.player_id].wins += 1;
  });
  return m;
}

export function ruleAnswer(question, { players, games, scores }) {
  const q = String(question || '').trim();
  if (!q) return { text: '请输入问题', source: 'rule' };

  const sc = scopeOf(q);
  const validGames = sc.from ? games.filter((g) => g.played_date >= sc.from) : games;
  const gameIds = new Set(validGames.map((g) => g.id));
  const valid = scores.filter((s) => gameIds.has(s.game_id));

  const pm = {};
  players.forEach((p) => { pm[p.id] = p; });
  const mentioned = players.filter((p) => p.nickname && q.includes(p.nickname));

  if (!valid.length) {
    return { text: `${sc.label}没有对局记录。`, source: 'rule' };
  }

  const stats = aggregate(valid);

  // 个人战绩
  if (mentioned.length === 1 && /战绩|怎么样|表现|多少分|积分/.test(q)) {
    const p = mentioned[0];
    const s = stats[p.id];
    if (!s) return { text: `${p.nickname}在${sc.label}没有对局记录。`, source: 'rule' };
    return {
      text: `${sc.label}，${p.nickname}打了 ${s.games} 局，赢 ${s.wins} 局，总积分 ${signed(s.points)}。`,
      source: 'rule'
    };
  }

  // 两人对比
  if (mentioned.length === 2) {
    const [a, b] = mentioned;
    const sa = stats[a.id];
    const sb = stats[b.id];
    if (!sa || !sb) return { text: `${sc.label}两人的记录不完整，无法对比。`, source: 'rule' };
    const lead = sa.points > sb.points ? a : b;
    return {
      text: `${sc.label}，${a.nickname} ${signed(sa.points)}（${sa.games}局），${b.nickname} ${signed(sb.points)}（${sb.games}局），${lead.nickname}领先。`,
      source: 'rule'
    };
  }

  const sorted = Object.entries(stats).sort((x, y) => y[1].points - x[1].points);

  if (/谁赢|赢最多|第一|最高/.test(q)) {
    const [pid, s] = sorted[0];
    return { text: `${sc.label}积分最高的是 ${(pm[pid] || {}).nickname || '未知'}，${signed(s.points)}（${s.games}局）。`, source: 'rule' };
  }

  if (/谁输|输最多|垫底|最低/.test(q)) {
    const [pid, s] = sorted[sorted.length - 1];
    return { text: `${sc.label}积分最低的是 ${(pm[pid] || {}).nickname || '未知'}，${signed(s.points)}（${s.games}局）。`, source: 'rule' };
  }

  if (/几局|多少局|局数/.test(q)) {
    if (mentioned.length === 1) {
      const s = stats[mentioned[0].id];
      return { text: `${sc.label}，${mentioned[0].nickname}打了 ${s ? s.games : 0} 局。`, source: 'rule' };
    }
    return { text: `${sc.label}一共打了 ${validGames.length} 局。`, source: 'rule' };
  }

  if (/排名|排行|前三|榜单/.test(q)) {
    const top = sorted.slice(0, 3).map(([pid, s], i) =>
      `第${i + 1}名 ${(pm[pid] || {}).nickname || '未知'} ${signed(s.points)}`
    );
    return { text: `${sc.label}排名：${top.join('、')}。`, source: 'rule' };
  }

  if (/胜率/.test(q)) {
    const byRate = Object.entries(stats)
      .filter(([, s]) => s.games >= 2)
      .sort((x, y) => y[1].wins / y[1].games - x[1].wins / x[1].games);
    if (!byRate.length) return { text: '对局数太少，还算不出有意义的胜率。', source: 'rule' };
    const [pid, s] = byRate[0];
    return {
      text: `${sc.label}胜率最高的是 ${(pm[pid] || {}).nickname || '未知'}，${Math.round((s.wins / s.games) * 100)}%（${s.games}局）。`,
      source: 'rule'
    };
  }

  return {
    text: '我没太理解这个问题。可以试试：今天谁赢最多 / 本周排名 / 某人战绩怎么样 / 一共打了几局',
    source: 'rule',
    fallback: true
  };
}

/**
 * 常驻快捷指令条为单行横排，四枚必须在 390px 视口内全部完整可见。
 * 容器 clientWidth 实测 343px；每枚宽 = 字数×12.33 + 24 内边距，枚间距 8px。
 * 四枚各 4 字：73×4 + 8×3 = 316px，余量 27px。
 * 曾用 6 字文案（合计 403px）导致首末枚被裁切且点不到 —— 08-25 真机审查实测。
 */
export const SUGGESTIONS = [
  '谁赢最多',
  '本周排名',
  '打了几局',
  '胜率最高'
];
