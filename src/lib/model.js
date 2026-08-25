/**
 * 业务模型层 —— 纯函数，无 DOM 无网络
 * 迁移自 _projects/战绩积分榜/app/utils/model.js，字段与 PRD §4 对齐
 */

export const PALETTE_SIZE = 8;

export function paletteColor(index) {
  const i = ((Number(index) || 0) % PALETTE_SIZE + PALETTE_SIZE) % PALETTE_SIZE;
  return `var(--c-p${i})`;
}

export function initial(nickname) {
  const s = String(nickname || '').trim();
  return s ? s[0] : '?';
}

/** 零和校验：一局内所有积分之和必须为 0（D-001 铁律） */
export function checkZeroSum(points) {
  const sum = points.reduce((acc, p) => acc + (Number(p) || 0), 0);
  return { ok: sum === 0, diff: sum };
}

/** 由积分推导胜负 */
export function deriveResult(points) {
  const p = Number(points) || 0;
  return p > 0 ? 'win' : p < 0 ? 'lose' : 'draw';
}

/** 最后一人自动补全：使总和归零 */
export function autoComplete(points, targetIndex) {
  const others = points.reduce(
    (acc, p, i) => (i === targetIndex ? acc : acc + (Number(p) || 0)),
    0
  );
  return -others;
}

export function formatDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatTime(d = new Date()) {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 本周起始日（周一为起点） */
export function weekStart(d = new Date()) {
  const dow = d.getDay() || 7;
  const s = new Date(d);
  s.setDate(d.getDate() - dow + 1);
  return formatDate(s);
}

export function monthStart(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** 积分显示：正数带 + 号 */
export function signed(n) {
  const v = Number(n) || 0;
  return v > 0 ? `+${v}` : String(v);
}

/** 负分一律中性弱色，禁止朱红（07-视觉设计.md 铁律） */
export function scoreClass(n) {
  const v = Number(n) || 0;
  return v > 0 ? 'score-pos' : v < 0 ? 'score-neg' : 'score-zero';
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
