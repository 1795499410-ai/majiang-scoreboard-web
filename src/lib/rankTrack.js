/**
 * 名次快照 —— 用于计算「相比上次查看，谁升了谁降了」
 * 存 sessionStorage：关掉标签页即清空，避免隔天打开还提示涨跌
 */
const KEY = 'mj_rank_snapshot';

function readAll() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

/** 取上次快照：{ [player_id]: { rank, points } } */
export function getSnapshot(scope) {
  return readAll()[scope] || null;
}

/**
 * 同一批数据只允许写入一次快照。
 * StrictMode 双挂载会让 load() 跑两次，第二次读到的已是新快照，
 * 导致 rankDelta 全部归零、箭头刚渲染就被抹掉。
 */
const written = new Set();

export function markWritten(scope, board) {
  const sig = `${scope}|${board.map((p) => `${p.player_id}:${p.points}`).join(',')}`;
  if (written.has(sig)) return false;
  written.add(sig);
  if (written.size > 24) written.delete(written.values().next().value);
  return true;
}

export function saveSnapshot(scope, board) {
  const map = {};
  board.forEach((p, i) => {
    map[p.player_id] = { rank: i + 1, points: p.points };
  });
  const all = readAll();
  all[scope] = map;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* 隐私模式下写入会失败，静默降级为无动画 */
  }
}

/**
 * 给榜单标注变化。返回新数组，每项附加：
 * rankDelta 正数=名次上升，负数=下降，0=不变或新入榜
 * pointsFrom 上次积分，用于滚动动画起点
 * isNew 本次首次入榜
 */
export function annotate(board, snapshot) {
  if (!snapshot) return board.map((p) => ({ ...p, rankDelta: 0, pointsFrom: p.points, isNew: false }));
  return board.map((p, i) => {
    const prev = snapshot[p.player_id];
    if (!prev) return { ...p, rankDelta: 0, pointsFrom: p.points, isNew: true };
    return {
      ...p,
      rankDelta: prev.rank - (i + 1),
      pointsFrom: prev.points,
      isNew: false
    };
  });
}

export function hasChanged(board, snapshot) {
  if (!snapshot) return false;
  return board.some((p, i) => {
    const prev = snapshot[p.player_id];
    return !prev || prev.rank !== i + 1 || prev.points !== p.points;
  });
}
