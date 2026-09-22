/**
 * 战报图生成 v2 —— 东方文书风
 * 升级点：麻将馆名金色印章 · AI点评卷轴 · 时间轴对战记录 · 云纹分隔
 * 输出 blob URL，由调用方决定下载或长按保存
 */


/**
 * SVG 纹理生成器 —— 替代 ImageGen，纯代码生成
 */
function createRicePaperPattern() {
  const size = 200;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="100%" height="100%" fill="#F7F2E8"/>
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="discrete" tableValues="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.02 0.03 0.02 0.01 0.02 0.01 0.02 0.03 0.02 0.01 0.02"/>
        </feComponentTransfer>
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" opacity="0.4"/>
      <g stroke="#D4C9A8" stroke-width="0.3" opacity="0.15">
        ${Array.from({length: 20}, (_, i) => `<line x1="0" y1="${i * 10}" x2="${size}" y2="${i * 10 + 5}"/>`).join('')}
        ${Array.from({length: 20}, (_, i) => `<line x1="${i * 10}" y1="0" x2="${i * 10 + 3}" y2="${size}"/>`).join('')}
      </g>
    </svg>
  `;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function createMahjongTilePattern() {
  const size = 60;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="100%" height="100%" fill="#FFFDF6"/>
      <rect x="2" y="2" width="${size-4}" height="${size-4}" rx="4" fill="none" stroke="#D4C9A8" stroke-width="1" opacity="0.3"/>
      <circle cx="${size/2}" cy="${size/2}" r="6" fill="none" stroke="#B8901F" stroke-width="1.5" opacity="0.2"/>
      <circle cx="${size/2 - 12}" cy="${size/2 - 12}" r="2" fill="#B8901F" opacity="0.15"/>
      <circle cx="${size/2 + 12}" cy="${size/2 + 12}" r="2" fill="#B8901F" opacity="0.15"/>
    </svg>
  `;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

const W = 750;
const PAD = 48;
const C = {
  bg: '#FAF8F3',
  dark: '#211F1C',
  deep: '#2C4A3B',
  primary: '#4A7C63',
  gold: '#B8901F',
  goldLight: '#D4AC42',
  goldDark: '#96740F',
  silver: '#8A8D93',
  bronze: '#96703F',
  text: '#1F1D1A',
  sub: '#6B655C',
  weak: '#9A948A',
  line: '#E5E1D8',
  card: '#FFFFFF',
  pos: '#4A7C63',
  neg: '#8C867C',
  paper: '#F7F2E8',
  paperBorder: '#D4C9A8'
};
const PALETTE = ['#4A7C63', '#C4553D', '#7A6A9B', '#2F6F87', '#A8722F', '#5E7D3F', '#9B5470', '#3D6B6B'];

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
const SERIF = '"Noto Serif SC","Songti SC","STSong",serif';
const NUM = '"DIN Alternate","SF Mono",ui-monospace,Menlo,monospace';
const DEFAULT_VENUE_NAME = '牌桌风云';

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

/** 宣纸纹理填充 */
function fillPaperTexture(ctx, x, y, w, h) {
  // 使用 SVG 宣纸纹理
  const patternUrl = createRicePaperPattern();
  const img = new Image();
  img.src = patternUrl;
  
  ctx.fillStyle = C.paper;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  
  // 细微噪点（备用，纹理加载失败时使用）
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 80; i++) {
    const nx = x + Math.random() * w;
    const ny = y + Math.random() * h;
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    ctx.fillRect(nx, ny, 1, 1);
  }
  ctx.restore();
}

/** 云纹分隔线 */
function drawCloudDivider(ctx, y) {
  const cy = y;
  ctx.save();
  // 左右渐变线
  const lg = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  lg.addColorStop(0, 'rgba(184,144,31,0)');
  lg.addColorStop(0.3, 'rgba(184,144,31,.25)');
  lg.addColorStop(0.5, 'rgba(184,144,31,.4)');
  lg.addColorStop(0.7, 'rgba(184,144,31,.25)');
  lg.addColorStop(1, 'rgba(184,144,31,0)');
  ctx.strokeStyle = lg;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, cy);
  ctx.lineTo(W - PAD, cy);
  ctx.stroke();
  // 中央云纹圆点
  ctx.fillStyle = C.goldLight;
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(W / 2 - 20, cy, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W / 2, cy, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W / 2 + 20, cy, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** 顶部竹林远山页头 v2 —— 麻将馆名金色印章 */
function drawHeader(ctx, title, subtitle, venueName = DEFAULT_VENUE_NAME) {
  const H = 260;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1A2E24');
  g.addColorStop(0.5, '#233B30');
  g.addColorStop(0.8, C.deep);
  g.addColorStop(1, C.primary);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 远山三层
  ctx.fillStyle = '#1D3128';
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(0, 160);
  [[90, 110], [175, 148], [265, 92], [370, 150], [470, 112], [580, 156], [680, 118], [750, 142]]
    .forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#152720';
  ctx.beginPath();
  ctx.moveTo(0, 175);
  [[60, 155], [140, 170], [220, 140], [310, 168], [420, 145], [530, 172], [640, 150], [750, 165]]
    .forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;

  // 飞檐
  ctx.fillStyle = '#16241D';
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(375, 60); ctx.lineTo(460, 92); ctx.lineTo(446, 98);
  ctx.lineTo(375, 70); ctx.lineTo(304, 98); ctx.lineTo(290, 92);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(348, 100, 54, 38);
  ctx.globalAlpha = 1;

  // 竹枝
  ctx.strokeStyle = '#1D3128';
  ctx.globalAlpha = 0.5;
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

  // ★ 麻将馆名：金色印章式底框 + 大字号
  const brand = String(venueName || DEFAULT_VENUE_NAME).replace(/[\r\n]+/g, ' ').trim() || DEFAULT_VENUE_NAME;
  ctx.textAlign = 'center';

  // 印章底框
  let brandSize = 38;
  ctx.font = `700 ${brandSize}px ${SERIF}`;
  const brandW = ctx.measureText(brand).width;
  const badgeW = Math.min(brandW + 48, W - PAD * 2);
  const badgeH = 52;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 18;

  // 底框：深色半透明 + 金色描边
  ctx.fillStyle = 'rgba(20,35,28,.55)';
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(184,144,31,.5)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
  ctx.stroke();

  // 金色渐变文字
  const brandGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
  brandGrad.addColorStop(0, '#E8D5A0');
  brandGrad.addColorStop(0.5, '#D4AC42');
  brandGrad.addColorStop(1, '#B8901F');
  ctx.fillStyle = brandGrad;
  ctx.font = `700 ${brandSize}px ${SERIF}`;
  ctx.fillText(brand, W / 2, badgeY + 36);

  // 标题（下移给馆名留空间）
  ctx.fillStyle = C.goldLight;
  ctx.font = `700 54px ${SERIF}`;
  ctx.fillText(title, W / 2, 140);

  // 金线（加宽）
  const lg = ctx.createLinearGradient(W / 2 - 150, 0, W / 2 + 150, 0);
  lg.addColorStop(0, 'rgba(184,144,31,0)');
  lg.addColorStop(0.3, 'rgba(212,172,66,.3)');
  lg.addColorStop(0.5, C.goldLight);
  lg.addColorStop(0.7, 'rgba(212,172,66,.3)');
  lg.addColorStop(1, 'rgba(184,144,31,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(W / 2 - 150, 158, 300, 2);

  // 副标题
  ctx.fillStyle = 'rgba(250,248,243,.85)';
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText(subtitle, W / 2, 196);

  // 底部渐变过渡到内容区
  const fadeG = ctx.createLinearGradient(0, H - 40, 0, H);
  fadeG.addColorStop(0, 'rgba(74,124,99,0)');
  fadeG.addColorStop(1, C.bg);
  ctx.fillStyle = fadeG;
  ctx.fillRect(0, H - 40, W, 40);

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
  // 云纹分隔
  drawCloudDivider(ctx, y);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.weak;
  ctx.font = `400 20px ${FONT}`;
  ctx.fillText('麻友排行榜 · 参与对战，排名实时更新', W / 2, y + 34);
  ctx.textAlign = 'left';
}

/** 熊猫 */
function drawPanda(ctx, cx, cy, s, maxY) {
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
  ctx.fillStyle = '#FFF';
  ctx.beginPath(); ctx.arc(-14.2, -4.2, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(17.8, -4.2, 1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1F1D1A';
  ctx.beginPath(); ctx.ellipse(0, 14, 5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(-7, 25, -13, 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(7, 25, 13, 20); ctx.stroke();
  ctx.restore();
}

function drawWrappedText(ctx, text, x, y, maxW, lineH, maxLines) {
  let line = '';
  let drawn = 0;
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line.length > 0) {
      ctx.fillText(line, x, y + drawn * lineH);
      drawn++;
      if (drawn >= maxLines) {
        // 末尾省略
        const truncated = line.slice(0, -1) + '…';
        ctx.fillText(truncated, x, y + (drawn - 1) * lineH);
        return drawn;
      }
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y + drawn * lineH);
    drawn++;
  }
  return drawn;
}

function toBlobUrl(cv) {
  return new Promise((resolve) => cv.toBlob((b) => resolve(URL.createObjectURL(b)), 'image/png'));
}

/* ================================================================
   导出函数
   ================================================================ */

export async function renderDailyPoster({ dateLabel, board, totalGames, venueName }) {
  const HEADER_H = 260;
  const PODIUM_H = 240;
  const REST_ITEM_H = 60;
  const SECTION_GAP = 36;
  const BOTTOM_PAD = 120;

  const top3 = board.slice(0, 3);
  const rest = board.slice(3);
  const restH = rest.length * REST_ITEM_H;

  const totalH = HEADER_H + PODIUM_H + SECTION_GAP + restH + BOTTOM_PAD;

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = totalH;
  const ctx = cv.getContext('2d');

  // 背景
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, totalH);

  // 页头
  drawHeader(ctx, '对战战报', dateLabel, venueName);

  // 领奖台
  const podiumY = HEADER_H + 20;
  const podiumOrder = [1, 0, 2].filter((i) => top3[i]);
  const tileW = 110, tileH = 140;
  const podiumSpacing = 150;
  const podiumStartX = (W - (podiumOrder.length * podiumSpacing - 30)) / 2;

  podiumOrder.forEach((idx, pos) => {
    const p = top3[idx];
    const tx = podiumStartX + pos * podiumSpacing;
    const ty = podiumY + (idx === 0 ? 0 : 30);

    drawTile(ctx, tx, ty, tileW, tileH, idx);

    // 名次汉字
    ctx.fillStyle = idx === 0 ? C.gold : idx === 1 ? C.silver : C.bronze;
    ctx.font = `700 32px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText(['冠', '亚', '季'][idx], tx + tileW / 2, ty + 50);

    // 头像
    drawAvatar(ctx, tx + tileW / 2, ty + 82, 18, p.nickname, p.avatar_color);

    // 昵称
    ctx.fillStyle = C.text;
    ctx.font = `500 22px ${FONT}`;
    ctx.fillText(p.nickname, tx + tileW / 2, ty + 116);

    // 积分
    ctx.fillStyle = scoreColor(p.points);
    ctx.font = `700 26px ${NUM}`;
    ctx.fillText(signed(p.points), tx + tileW / 2, ty + 148);
    ctx.textAlign = 'left';
  });

  // 云纹分隔
  const afterPodiumY = podiumY + PODIUM_H - 10;
  drawCloudDivider(ctx, afterPodiumY);

  // 其余排名
  let y = afterPodiumY + SECTION_GAP;
  rest.forEach((p, i) => {
    const rowH = 56;
    // 行背景
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.5)' : 'transparent';
    ctx.fillRect(PAD, y, W - PAD * 2, rowH);

    // 名次
    ctx.fillStyle = C.weak;
    ctx.font = `600 22px ${NUM}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${i + 4}`, PAD + 30, y + 34);
    ctx.textAlign = 'left';

    // 头像
    drawAvatar(ctx, PAD + 52, y + 28, 18, p.nickname, p.avatar_color);

    // 昵称
    ctx.fillStyle = C.text;
    ctx.font = `400 24px ${FONT}`;
    ctx.fillText(p.nickname, PAD + 80, y + 34);

    // 积分
    ctx.fillStyle = scoreColor(p.points);
    ctx.font = `700 26px ${NUM}`;
    ctx.textAlign = 'right';
    ctx.fillText(signed(p.points), W - PAD - 16, y + 34);
    ctx.textAlign = 'left';

    y += rowH + 4;
  });

  // 熊猫 & 页脚
  drawPanda(ctx, W - 92, y + 50, 80, totalH - 100);
  drawFooter(ctx, totalH - 62);

  return toBlobUrl(cv);
}

export async function renderTablesPoster({ dateLabel, board, tableSummary, aiEval, filteredTables, venueName }) {
  const HEADER_H = 260;
  const SUMMARY_TITLE_H = 40;
  const SUMMARY_CARD_H = 110;
  const SUMMARY_GAP = 16;
  const SUMMARY_META_H = 20;
  const SUMMARY_BOTTOM_PAD = 20;
  const AI_SCROLL_H = 180;
  const TABLE_TITLE_H = 40;
  const MAX_TABLES_SHOWN = 6;

  const shownTables = filteredTables.slice(0, MAX_TABLES_SHOWN);
  const overflowCount = Math.max(0, filteredTables.length - MAX_TABLES_SHOWN);

  // 动态计算高度
  let totalH = HEADER_H + 40; // header + initial gap

  // 战绩总结区
  if (tableSummary) {
    totalH += SUMMARY_TITLE_H + SUMMARY_CARD_H + SUMMARY_GAP;
    if (aiEval) totalH += AI_SCROLL_H + SUMMARY_GAP;
    totalH += SUMMARY_BOTTOM_PAD;
  }

  // 分隔
  totalH += 20;

  // 对战记录
  totalH += TABLE_TITLE_H;
  shownTables.forEach((t) => {
    const playerRows = Math.ceil(t.players.length / 2);
    totalH += 44 + playerRows * 40 + 20;
  });
  if (overflowCount > 0) totalH += 40;

  totalH += 140; // panda + footer

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = totalH;
  const ctx = cv.getContext('2d');

  // 背景
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, totalH);

  // 页头
  const scopeLabel = dateLabel || '全部对战';
  drawHeader(ctx, '对战战报', scopeLabel, venueName);

  let y = HEADER_H + 20;

  // --- 战绩总结 ---
  if (tableSummary) {
    // 标题行
    ctx.fillStyle = C.text;
    ctx.font = `600 26px ${SERIF}`;
    ctx.fillText('战绩总结', PAD, y + 28);
    ctx.fillStyle = C.weak;
    ctx.font = `400 20px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${tableSummary.tableCount}桌 · ${tableSummary.totalGames}局`, W - PAD, y + 28);
    ctx.textAlign = 'left';
    y += SUMMARY_TITLE_H + 12;

    // 前4名玩家 2×2 网格（升级：更大卡片 + 更精致）
    const top4 = tableSummary.players.slice(0, 4);
    const maxPoints = Math.max(...top4.map((p) => Math.abs(p.points)), 1);
    const cardW = (W - PAD * 2 - 20) / 2;
    const cardH = SUMMARY_CARD_H;
    const gap = 20;

    const medalColors = [C.gold, C.silver, C.bronze, C.weak];

    top4.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = PAD + col * (cardW + gap);
      const cy = y + row * (cardH + gap);

      // 卡片背景（宣纸质感）
      fillPaperTexture(ctx, cx, cy, cardW, cardH);

      // 金色边框（前3名）
      if (idx < 3) {
        ctx.strokeStyle = medalColors[idx];
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4;
        roundRect(ctx, cx, cy, cardW, cardH, 14);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 左侧名次色条（加宽）
      ctx.fillStyle = medalColors[idx] || C.weak;
      roundRect(ctx, cx, cy, 8, cardH, 4);
      ctx.fill();

      // 名次徽章
      ctx.fillStyle = '#fff';
      ctx.font = `700 18px ${NUM}`;
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, cx + 4, cy + 22);
      ctx.textAlign = 'left';

      // 头像（加大）
      drawAvatar(ctx, cx + 40, cy + 36, 22, p.nickname, p.avatar_color);

      // 昵称
      ctx.fillStyle = C.text;
      ctx.font = `600 24px ${FONT}`;
      ctx.fillText(p.nickname, cx + 72, cy + 32);

      // 局数
      ctx.fillStyle = C.weak;
      ctx.font = `400 18px ${FONT}`;
      ctx.fillText(`${p.games}局`, cx + 72, cy + 54);

      // 积分（加大 + 右对齐）
      ctx.fillStyle = scoreColor(p.points);
      ctx.font = `700 30px ${NUM}`;
      ctx.textAlign = 'right';
      ctx.fillText(signed(p.points), cx + cardW - 16, cy + 40);
      ctx.textAlign = 'left';

      // 迷你柱状条
      const barY = cy + cardH - 24;
      const barW = cardW - 36;
      const barFill = Math.abs(p.points) / maxPoints * barW;
      ctx.fillStyle = '#EDE8DC';
      roundRect(ctx, cx + 18, barY, barW, 8, 4);
      ctx.fill();
      ctx.fillStyle = p.points >= 0 ? C.pos : C.neg;
      if (barFill > 0) {
        roundRect(ctx, cx + 18, barY, Math.max(barFill, 8), 8, 4);
        ctx.fill();
      }
    });

    y += 2 * cardH + gap + SUMMARY_META_H + SUMMARY_BOTTOM_PAD;

    // --- AI 点评：卷轴样式 ---
    if (aiEval) {
      const scrollX = PAD + 16;
      const scrollW = W - PAD * 2 - 32;
      const scrollH = AI_SCROLL_H;

      // 卷轴背景（宣纸 + 金色边框）
      fillPaperTexture(ctx, scrollX, y, scrollW, scrollH);
      ctx.strokeStyle = C.paperBorder;
      ctx.lineWidth = 1.5;
      roundRect(ctx, scrollX, y, scrollW, scrollH, 14);
      ctx.stroke();

      // 左右卷轴装饰
      const rollerW = 12;
      const rollerGrad = ctx.createLinearGradient(scrollX - 6, 0, scrollX + rollerW, 0);
      rollerGrad.addColorStop(0, '#8B7355');
      rollerGrad.addColorStop(0.5, '#C4A97D');
      rollerGrad.addColorStop(1, '#8B7355');
      ctx.fillStyle = rollerGrad;
      roundRect(ctx, scrollX - 6, y + 8, rollerW, scrollH - 16, 4);
      ctx.fill();
      ctx.fillStyle = rollerGrad;
      roundRect(ctx, scrollX + scrollW - 6, y + 8, rollerW, scrollH - 16, 4);
      ctx.fill();

      // 卷轴两端圆头
      ctx.fillStyle = '#6B5335';
      ctx.beginPath(); ctx.arc(scrollX, y + 12, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(scrollX, y + scrollH - 12, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(scrollX + scrollW, y + 12, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(scrollX + scrollW, y + scrollH - 12, 7, 0, Math.PI * 2); ctx.fill();

      // "AI 点评" 竖排印章标签（左侧）
      ctx.save();
      ctx.translate(scrollX + 28, y + 30);
      ctx.fillStyle = 'rgba(184,144,31,.12)';
      roundRect(ctx, -14, -8, 28, 80, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(184,144,31,.35)';
      ctx.lineWidth = 1;
      roundRect(ctx, -14, -8, 28, 80, 6);
      ctx.stroke();
      ctx.fillStyle = C.gold;
      ctx.font = `600 16px ${SERIF}`;
      ctx.textAlign = 'center';
      const sealChars = 'AI点评';
      for (let i = 0; i < sealChars.length; i++) {
        ctx.fillText(sealChars[i], 0, 12 + i * 20);
      }
      ctx.restore();

      // 大号引号装饰
      ctx.fillStyle = C.goldLight;
      ctx.globalAlpha = 0.3;
      ctx.font = `700 56px ${SERIF}`;
      ctx.textAlign = 'left';
      ctx.fillText('\u201C', scrollX + 48, y + 46);
      ctx.textAlign = 'right';
      ctx.fillText('\u201D', scrollX + scrollW - 16, y + scrollH - 16);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;

      // 点评文本（加大字号 + 行高 + 左右留白）
      ctx.fillStyle = C.sub;
      ctx.font = `400 23px ${FONT}`;
      const textX = scrollX + 52;
      const textW = scrollW - 72;
      drawWrappedText(ctx, aiEval, textX, y + 36, textW, 32, 4);

      y += scrollH + SUMMARY_GAP;
    }
  }

  // 云纹分隔
  drawCloudDivider(ctx, y + 10);
  y += 30;

  // --- 对战记录：时间轴样式 ---
  ctx.fillStyle = C.text;
  ctx.font = `600 26px ${SERIF}`;
  ctx.fillText(`对战记录（${filteredTables.length}）`, PAD, y + 22);
  y += TABLE_TITLE_H + 8;

  // 时间轴竖线
  const timelineX = PAD + 18;
  ctx.strokeStyle = 'rgba(184,144,31,.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(timelineX, y);
  ctx.lineTo(timelineX, y + shownTables.length * 120);
  ctx.stroke();
  ctx.setLineDash([]);

  shownTables.forEach((t, i) => {
    const playerRows = Math.ceil(t.players.length / 2);
    const cardH = 48 + playerRows * 40 + 16;
    const cardX = PAD + 36;
    const cardW = W - PAD * 2 - 36;

    // 时间轴节点
    ctx.fillStyle = C.goldLight;
    ctx.beginPath();
    ctx.arc(timelineX, y + 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.bg;
    ctx.beginPath();
    ctx.arc(timelineX, y + 24, 3, 0, Math.PI * 2);
    ctx.fill();

    // 卡片背景
    ctx.fillStyle = C.card;
    roundRect(ctx, cardX, y, cardW, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.04)';
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, y, cardW, cardH, 12);
    ctx.stroke();

    // 日期 + 局数
    ctx.fillStyle = C.text;
    ctx.font = `600 22px ${NUM}`;
    ctx.fillText(t.played_date, cardX + 16, y + 30);
    ctx.fillStyle = C.weak;
    ctx.font = `400 18px ${FONT}`;
    ctx.fillText(`${t.rounds}局`, cardX + 130, y + 30);

    // 分隔线
    ctx.fillStyle = C.line;
    ctx.fillRect(cardX + 12, y + 40, cardW - 24, 1);

    // 玩家得分 2列布局
    t.players.forEach((p, j) => {
      const col = j % 2;
      const row = Math.floor(j / 2);
      const px = cardX + 16 + col * ((cardW - 32) / 2);
      const py = y + 48 + 24 + row * 40;

      drawAvatar(ctx, px + 14, py, 13, p.nickname, p.avatar_color);

      ctx.fillStyle = C.text;
      ctx.font = `400 21px ${FONT}`;
      ctx.fillText(p.nickname, px + 34, py + 5);

      ctx.fillStyle = scoreColor(p.points);
      ctx.font = `600 22px ${NUM}`;
      ctx.textAlign = 'right';
      ctx.fillText(signed(p.points), px + (cardW - 32) / 2 - 8, py + 5);
      ctx.textAlign = 'left';
    });

    y += cardH + 12;
  });

  if (overflowCount > 0) {
    ctx.fillStyle = C.weak;
    ctx.font = `400 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`共 ${filteredTables.length} 桌，已展示最近 ${MAX_TABLES_SHOWN} 桌`, W / 2, y + 18);
    ctx.textAlign = 'left';
    y += 32;
  }

  y += 16;

  // --- Panda & Footer ---
  drawPanda(ctx, W - 92, y + 62, 92, totalH - 118);
  drawFooter(ctx, totalH - 62);
  return toBlobUrl(cv);
}

export async function renderTablePoster({ dateLabel, rounds, totals, venueName }) {
  const HEADER_H = 260;
  const TOTALS_H = 60;
  const ROUND_H = 100;
  const BOTTOM_PAD = 120;

  const totalH = HEADER_H + 30 + totals.length * TOTALS_H + 20 + rounds.length * ROUND_H + BOTTOM_PAD;

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = totalH;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, totalH);

  drawHeader(ctx, '单桌战报', dateLabel, venueName);

  let y = HEADER_H + 20;

  // 累计积分
  ctx.fillStyle = C.text;
  ctx.font = `600 24px ${SERIF}`;
  ctx.fillText('本桌累计', PAD, y + 28);
  y += 40;

  totals.forEach((p) => {
    ctx.fillStyle = C.card;
    roundRect(ctx, PAD, y, W - PAD * 2, 52, 10);
    ctx.fill();

    drawAvatar(ctx, PAD + 30, y + 26, 18, p.nickname, p.avatar_color);
    ctx.fillStyle = C.text;
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText(p.nickname, PAD + 58, y + 32);

    ctx.fillStyle = scoreColor(p.points);
    ctx.font = `700 28px ${NUM}`;
    ctx.textAlign = 'right';
    ctx.fillText(signed(p.points), W - PAD - 16, y + 34);
    ctx.textAlign = 'left';

    y += 60;
  });

  y += 10;
  drawCloudDivider(ctx, y);
  y += 24;

  rounds.forEach((r, i) => {
    ctx.fillStyle = C.text;
    ctx.font = `600 22px ${NUM}`;
    ctx.fillText(`第 ${r.round_num} 局`, PAD, y + 26);

    r.scores.forEach((p, j) => {
      const col = j % 2;
      const row = Math.floor(j / 2);
      const px = PAD + col * ((W - PAD * 2) / 2);
      const py = y + 42 + row * 36;

      drawAvatar(ctx, px + 14, py, 12, p.nickname, p.avatar_color);
      ctx.fillStyle = C.text;
      ctx.font = `400 21px ${FONT}`;
      ctx.fillText(p.nickname, px + 32, py + 5);

      ctx.fillStyle = scoreColor(p.points);
      ctx.font = `600 22px ${NUM}`;
      ctx.textAlign = 'right';
      ctx.fillText(signed(p.points), px + (W - PAD * 2) / 2 - 8, py + 5);
      ctx.textAlign = 'left';
    });

    y += ROUND_H;
  });

  drawPanda(ctx, W - 92, y + 50, 80, totalH - 100);
  drawFooter(ctx, totalH - 62);
  return toBlobUrl(cv);
}

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
