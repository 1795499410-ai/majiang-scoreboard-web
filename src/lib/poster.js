/**
 * 战报图生成 —— Canvas 绘制，竹林东方风
 * 输出 blob URL，由调用方决定下载或长按保存
 */

const W = 750;
const PAD = 48;
const C = {
  bg: '#FAF8F3',
  dark: '#211F1C',
  deep: '#2C4A3B',
  primary: '#4A7C63',
  gold: '#B8901F',
  goldLight: '#D4AC42',
  silver: '#8A8D93',
  bronze: '#96703F',
  text: '#1F1D1A',
  sub: '#6B655C',
  weak: '#9A948A',
  line: '#E5E1D8',
  card: '#FFFFFF',
  pos: '#4A7C63',
  neg: '#8C867C'
};
const PALETTE = ['#4A7C63', '#C4553D', '#7A6A9B', '#2F6F87', '#A8722F', '#5E7D3F', '#9B5470', '#3D6B6B'];

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
const NUM = '"DIN Alternate","SF Mono",ui-monospace,Menlo,monospace';

const signed = (n) => (n > 0 ? `+${n}` : String(n));
const scoreColor = (n) => (n > 0 ? C.pos : n < 0 ? C.neg : C.sub);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 顶部竹林远山页头 */
function drawHeader(ctx, title, subtitle) {
  const H = 230;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#233B30');
  g.addColorStop(0.6, C.deep);
  g.addColorStop(1, C.primary);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 远山
  ctx.fillStyle = '#1D3128';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, 150);
  [[90, 96], [175, 138], [265, 78], [370, 140], [470, 100], [580, 146], [680, 108], [750, 132]]
    .forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;

  // 飞檐
  ctx.fillStyle = '#16241D';
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(375, 52); ctx.lineTo(468, 88); ctx.lineTo(452, 94);
  ctx.lineTo(375, 64); ctx.lineTo(298, 94); ctx.lineTo(282, 88);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(345, 96, 60, 42);
  ctx.globalAlpha = 1;

  // 竹枝
  ctx.strokeStyle = '#1D3128';
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 5;
  [36, 74, 676, 714].forEach((x, i) => {
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x, i % 2 === 0 ? 40 : 84);
    ctx.stroke();
  });
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(36, 96); ctx.quadraticCurveTo(66, 78, 88, 86); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(714, 76); ctx.quadraticCurveTo(684, 58, 662, 66); ctx.stroke();
  ctx.globalAlpha = 1;

  // 标题
  ctx.textAlign = 'center';
  ctx.fillStyle = C.goldLight;
  ctx.font = `700 52px ${FONT}`;
  ctx.fillText(title, W / 2, 152);

  // 金线
  const lg = ctx.createLinearGradient(W / 2 - 130, 0, W / 2 + 130, 0);
  lg.addColorStop(0, 'rgba(184,144,31,0)');
  lg.addColorStop(0.5, C.goldLight);
  lg.addColorStop(1, 'rgba(184,144,31,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(W / 2 - 130, 168, 260, 2);

  ctx.fillStyle = 'rgba(250,248,243,.82)';
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText(subtitle, W / 2, 200);
  ctx.textAlign = 'left';
}

/** 麻将牌造型的名次牌 */
function drawTile(ctx, x, y, w, h, rank) {
  const tones = [
    { face: '#FFFDF6', edge: C.gold, glow: 'rgba(184,144,31,.35)' },
    { face: '#FCFCFD', edge: C.silver, glow: 'rgba(138,141,147,.28)' },
    { face: '#FDFAF6', edge: C.bronze, glow: 'rgba(150,112,63,.28)' }
  ];
  const t = tones[rank] || tones[0];

  ctx.save();
  ctx.shadowColor = t.glow;
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = t.face;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = t.edge;
  ctx.lineWidth = 2.5;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();

  // 牌面装饰点
  ctx.fillStyle = t.edge;
  ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.arc(x + 14, y + 14, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + w - 14, y + h - 14, 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawAvatar(ctx, cx, cy, r, nickname, colorIndex) {
  ctx.fillStyle = PALETTE[(colorIndex || 0) % 8];
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.round(r * 0.95)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((nickname || '?')[0], cx, cy + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawFooter(ctx, y) {
  ctx.fillStyle = C.line;
  ctx.fillRect(PAD, y, W - PAD * 2, 1);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.weak;
  ctx.font = `400 20px ${FONT}`;
  ctx.fillText('麻友排行榜 · 参与对战，排名实时更新', W / 2, y + 34);
  ctx.textAlign = 'left';
}

/** 熊猫（简化版，画在角落） */
function drawPanda(ctx, cx, cy, s, maxY) {
  // 夹取到落款之上，防止内容超长时熊猫溢出画布
  if (typeof maxY === 'number') cy = Math.min(cy, maxY);
  const u = s / 120;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(u, u);
  ctx.fillStyle = '#1F1D1A';
  ctx.beginPath(); ctx.arc(-30, -32, 15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(30, -32, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFDF8';
  ctx.beginPath(); ctx.ellipse(0, 0, 42, 38, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1F1D1A';
  ctx.save(); ctx.rotate(-0.2);
  ctx.beginPath(); ctx.ellipse(-18, -6, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.rotate(0.2);
  ctx.beginPath(); ctx.ellipse(18, -6, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#FFFDF8';
  ctx.beginPath(); ctx.arc(-16, -4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(16, -4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1F1D1A';
  ctx.beginPath(); ctx.arc(-15, -3, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(17, -3, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 14, 5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1F1D1A'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(-7, 25, -13, 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(7, 25, 13, 20); ctx.stroke();
  ctx.restore();
}

function makeCanvas(height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const cv = document.createElement('canvas');
  cv.width = W * dpr;
  cv.height = height * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, height);
  return { cv, ctx };
}

function toBlobUrl(cv) {
  return new Promise((resolve, reject) => {
    cv.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('图片生成失败'))), 'image/png');
  });
}

/** 一日战报：领奖台 + 全员积分 */
export async function renderDailyPoster({ dateLabel, board, totalGames }) {
  const rows = board.slice(3);
  // 尾部预留 168px：熊猫 92 + 落款 62 + 呼吸位，避免熊猫压住最后一行
  const TAIL = 168;
  const H = 268 + 258 + 42 + (rows.length ? rows.length * 74 + 16 : 0) + TAIL;
  const { cv, ctx } = makeCanvas(H);

  drawHeader(ctx, '麻友排行榜', `${dateLabel} · 共 ${totalGames} 局`);

  let y = 268;
  const top3 = board.slice(0, 3);
  const order = [1, 0, 2].filter((i) => top3[i]);
  const tw = 190, gap = 14;
  const PODIUM_MAX = 258;
  const startX = (W - (tw * order.length + gap * (order.length - 1))) / 2;

  order.forEach((idx, pos) => {
    const p = top3[idx];
    // 高度差保留层次感，但下限须容纳「名次+头像+名字+积分+统计」五行，
    // 实测最小安全高度 218px，低于此值积分会贴上统计行
    const heights = { 0: 258, 1: 240, 2: 240 };
    const th = heights[idx];
    const x = startX + pos * (tw + gap);
    const ty = y + (PODIUM_MAX - th);

    drawTile(ctx, x, ty, tw, th, idx);

    ctx.textAlign = 'center';
    ctx.fillStyle = [C.gold, C.silver, C.bronze][idx];
    ctx.font = `700 34px ${NUM}`;
    ctx.fillText(String(idx + 1), x + tw / 2, ty + 46);

    // 单一坐标系顺序排布：名次 → 头像 → 名字 → 积分 → 统计。
    // 混用「顶部固定偏移」与「底部反推」会在矮牌上撞行，此前的重叠即源于此。
    const cx = x + tw / 2;
    const avatarR = 28;
    let cy = ty + 56;                       // 名次基线下方起排

    drawAvatar(ctx, cx, cy + avatarR, avatarR, p.nickname, p.avatar_color);
    cy += avatarR * 2 + 32;

    ctx.textAlign = 'center';
    ctx.fillStyle = C.text;
    ctx.font = `600 25px ${FONT}`;
    const name = p.nickname.length > 5 ? p.nickname.slice(0, 5) + '…' : p.nickname;
    ctx.fillText(name, cx, cy);
    cy += 40;

    ctx.fillStyle = scoreColor(p.points);
    ctx.font = `700 ${idx === 0 ? 40 : 36}px ${NUM}`;
    ctx.fillText(signed(p.points), cx, cy);

    // 统计行钉在牌底，与积分之间的余量由牌高吸收
    ctx.fillStyle = C.weak;
    ctx.font = `400 19px ${FONT}`;
    ctx.fillText(`${p.games}局 · ${p.win_rate}%`, cx, ty + th - 18);
    ctx.textAlign = 'left';
  });

  y += PODIUM_MAX + 42;

  if (rows.length) {
    const ch = rows.length * 74 + 16;
    ctx.fillStyle = C.card;
    roundRect(ctx, PAD, y, W - PAD * 2, ch, 16);
    ctx.fill();

    rows.forEach((p, i) => {
      const ry = y + 16 + i * 74;
      ctx.fillStyle = C.weak;
      ctx.font = `500 24px ${NUM}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 4), PAD + 40, ry + 44);
      ctx.textAlign = 'left';

      drawAvatar(ctx, PAD + 96, ry + 37, 24, p.nickname, p.avatar_color);

      ctx.fillStyle = C.text;
      ctx.font = `500 27px ${FONT}`;
      ctx.fillText(p.nickname, PAD + 132, ry + 34);
      ctx.fillStyle = C.weak;
      ctx.font = `400 19px ${FONT}`;
      ctx.fillText(`${p.games}局 · 胜率${p.win_rate}%`, PAD + 132, ry + 58);

      ctx.fillStyle = scoreColor(p.points);
      ctx.font = `700 32px ${NUM}`;
      ctx.textAlign = 'right';
      ctx.fillText(signed(p.points), W - PAD - 24, ry + 48);
      ctx.textAlign = 'left';

      if (i < rows.length - 1) {
        ctx.fillStyle = C.line;
        ctx.fillRect(PAD + 24, ry + 73, W - PAD * 2 - 48, 1);
      }
    });
    y += ch;
  }

  // 基于内容实际结束位置定位，而非画布高度倒推
  drawPanda(ctx, W - 92, y + 62, 92, H - 118);
  drawFooter(ctx, H - 62);
  return toBlobUrl(cv);
}

/** 单桌战报：每局明细 + 累计 */
export async function renderTablePoster({ dateLabel, rounds, totals }) {
  const roundsH = rounds.reduce((s, r) => s + 54 + r.scores.length * 40 + 18, 0);
  const TAIL = 168;
  // 230 页头 + 38 累计标题 + 累计卡 + 40 间距 + 62 明细标题 + 明细 + 尾部
  const H = 230 + 38 + (totals.length * 62 + 16) + 40 + 22 + roundsH + TAIL;
  const { cv, ctx } = makeCanvas(H);

  drawHeader(ctx, '本桌战报', `${dateLabel} · 共 ${rounds.length} 局`);

  let y = 268;

  ctx.fillStyle = C.sub;
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText('本桌累计', PAD, y);
  y += 20;

  const th = totals.length * 62 + 16;
  ctx.fillStyle = C.card;
  roundRect(ctx, PAD, y, W - PAD * 2, th, 16);
  ctx.fill();

  totals.forEach((p, i) => {
    const ry = y + 16 + i * 62;
    if (i < 3) {
      ctx.fillStyle = [C.gold, C.silver, C.bronze][i];
      ctx.font = `700 22px ${NUM}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), PAD + 36, ry + 36);
      ctx.textAlign = 'left';
    }
    drawAvatar(ctx, PAD + 88, ry + 30, 21, p.nickname, p.avatar_color);
    ctx.fillStyle = C.text;
    ctx.font = `500 27px ${FONT}`;
    ctx.fillText(p.nickname, PAD + 120, ry + 39);
    ctx.fillStyle = scoreColor(p.points);
    ctx.font = `700 31px ${NUM}`;
    ctx.textAlign = 'right';
    ctx.fillText(signed(p.points), W - PAD - 24, ry + 40);
    ctx.textAlign = 'left';
    if (i < totals.length - 1) {
      ctx.fillStyle = C.line;
      ctx.fillRect(PAD + 24, ry + 61, W - PAD * 2 - 48, 1);
    }
  });
  y += th + 40;

  ctx.fillStyle = C.sub;
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText('每局明细', PAD, y);
  y += 22;

  rounds.forEach((r) => {
    const rh = 54 + r.scores.length * 40;
    ctx.fillStyle = C.card;
    roundRect(ctx, PAD, y, W - PAD * 2, rh, 14);
    ctx.fill();

    ctx.fillStyle = C.primary;
    ctx.font = `600 23px ${FONT}`;
    ctx.fillText(`第 ${r.round_num} 局`, PAD + 24, y + 36);
    if (r.played_time) {
      ctx.fillStyle = C.weak;
      ctx.font = `400 19px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(r.played_time, W - PAD - 24, y + 36);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = C.line;
    ctx.fillRect(PAD + 24, y + 48, W - PAD * 2 - 48, 1);

    r.scores.forEach((s, j) => {
      const sy = y + 54 + j * 40;
      ctx.fillStyle = C.text;
      ctx.font = `400 24px ${FONT}`;
      ctx.fillText(s.nickname, PAD + 24, sy + 26);
      ctx.fillStyle = scoreColor(s.points);
      ctx.font = `600 26px ${NUM}`;
      ctx.textAlign = 'right';
      ctx.fillText(signed(s.points), W - PAD - 24, sy + 26);
      ctx.textAlign = 'left';
    });
    y += rh + 18;
  });

  drawPanda(ctx, W - 92, y + 48, 92, H - 118);
  drawFooter(ctx, H - 62);
  return toBlobUrl(cv);
}

/**
 * 保存图片。iOS Safari 不支持 a[download] 触发下载，
 * 返回 'download' | 'longpress' 告知调用方该显示什么提示。
 */
export function savePoster(url, filename) {
  const ua = navigator.userAgent;
  const isIOS = /iP(hone|ad|od)/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const supportsDownload = 'download' in document.createElement('a');

  if (isIOS || !supportsDownload) return 'longpress';

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return 'download';
}
