/**
 * 战报图生成 v3 —— 精简东方风（方向 C）
 *
 * 设计原则：
 * - 大量留白，信息不堆叠
 * - 去掉熊猫、宣纸纹理、云纹、竹林场景
 * - 保留金色角标印章 + 麻将牌名次徽章
 * - 米白底色，深绿页头，克制的金色点缀
 * - 2x Retina 输出（1500px 宽）
 */

const W = 750;
const PAD = 48;
const CONTENT_W = W - PAD * 2;

const C = {
  bg: '#FAF8F3',
  headerBg: '#1E3A2F',
  headerBg2: '#264A3C',
  gold: '#B8901F',
  goldLight: '#D4AC42',
  goldDark: '#96740F',
  text: '#1F1D1A',
  sub: '#6B655C',
  weak: '#9A948A',
  line: '#E5E1D8',
  card: '#FFFFFF',
  pos: '#4A7C63',
  neg: '#8A8D93',
  zero: '#9A948A',
  seal: '#C4553D',
};

const PALETTE = ['#4A7C63', '#C4553D', '#7A6A9B', '#2F6F87', '#A8722F', '#5E7D3F', '#9B5470', '#3D6B6B'];

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
const SERIF = '"Noto Serif SC","Songti SC","STSong",serif';
const NUM = '"DIN Alternate","SF Mono",ui-monospace,Menlo,monospace';

const signed = (n) => (n > 0 ? `+${n}` : String(n));
const scoreColor = (n) => (n > 0 ? C.pos : n < 0 ? C.neg : C.zero);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 金色角标印章（右上角，小尺寸） */
function drawSeal(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.12);
  const s = size;
  // 外框
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  roundRect(ctx, -s / 2, -s / 2, s, s, 3);
  ctx.stroke();
  // 内框
  roundRect(ctx, -s / 2 + 4, -s / 2 + 4, s - 8, s - 8, 2);
  ctx.stroke();
  // 文字
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = C.gold;
  ctx.font = `600 ${Math.round(s * 0.42)}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('局', 0, 1);
  ctx.restore();
}

/** 页头：深绿背景 + 标题 + 日期 + 角标 */
function drawHeader(ctx, title, subtitle, venueName, totalH) {
  const H = 200;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.headerBg);
  g.addColorStop(1, C.headerBg2);

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 底部微渐变过渡到米白
  const fade = ctx.createLinearGradient(0, H - 30, 0, H);
  fade.addColorStop(0, 'rgba(30,58,47,0)');
  fade.addColorStop(1, C.bg);
  ctx.fillStyle = fade;
  ctx.fillRect(0, H - 30, W, 30);

  // 场馆名（左上，小字）
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `400 22px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(venueName || '牌桌风云', PAD, 36);

  // 主标题
  ctx.fillStyle = '#FFFDF6';
  ctx.font = `600 42px ${SERIF}`;
  ctx.fillText(title, PAD, 76);

  // 副标题（日期）
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText(subtitle, PAD, 130);

  // 金色角标印章（右上角）
  drawSeal(ctx, W - PAD - 20, 52, 56);
}

/** 页脚：极简 */
function drawFooter(ctx, y) {
  ctx.save();
  ctx.fillStyle = C.weak;
  ctx.font = `400 18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('— 牌桌风云 —', W / 2, y);
  ctx.restore();
}

/** 头像绘制 */
function drawAvatar(ctx, x, y, r, nickname, colorIndex) {
  const color = PALETTE[((Number(colorIndex) || 0) % 8 + 8) % 8];
  const initial = String(nickname || '?')[0];

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.round(r * 0.9)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, x, y + 1);
  ctx.restore();
}

/** 麻将牌名次徽章 */
function drawRankBadge(ctx, x, y, size, rank) {
  const colors = { 0: C.gold, 1: '#8A8D93', 2: '#96703F' };
  const labels = ['冠', '亚', '季'];
  const color = colors[rank] || C.weak;
  const label = labels[rank] || String(rank + 1);

  ctx.save();
  // 牌面
  roundRect(ctx, x - size / 2, y - size / 2, size, size, 6);
  ctx.fillStyle = '#FFFDF6';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 文字
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(size * 0.55)}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 1);
  ctx.restore();
}

/** 分隔线（极简） */
function drawDivider(ctx, y) {
  ctx.save();
  const g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  g.addColorStop(0, 'rgba(184,144,31,0)');
  g.addColorStop(0.5, 'rgba(184,144,31,0.25)');
  g.addColorStop(1, 'rgba(184,144,31,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  ctx.restore();
}

/** 积分文字 */
function drawScore(ctx, x, y, value, align = 'right', fontSize = 36) {
  ctx.save();
  ctx.fillStyle = scoreColor(value);
  ctx.font = `700 ${fontSize}px ${NUM}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(signed(value), x, y);
  ctx.restore();
}

/** 将 canvas 转为 blob URL */
function toBlobUrl(cv) {
  return new Promise((resolve) => {
    cv.toBlob((blob) => {
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
}

// ============================================================
// 日榜 / 周榜 / 总榜战报
// ============================================================
export async function renderDailyPoster({ dateLabel, board, totalGames, venueName }) {
  const HEADER_H = 200;
  const STATS_H = 70;
  const ROW_H = 72;
  const FOOTER_H = 80;
  const GAP = 20;

  const safeBoard = board || [];
  const playerCount = Math.min(safeBoard.length, 20);
  const totalH = HEADER_H + STATS_H + GAP + playerCount * ROW_H + GAP + FOOTER_H;

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = totalH;
  const ctx = cv.getContext('2d');

  // 背景
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, totalH);

  // 页头
  drawHeader(ctx, dateLabel || '战报', '', venueName, totalH);

  let y = HEADER_H + 24;

  // 统计条
  ctx.fillStyle = C.card;
  roundRect(ctx, PAD, y, CONTENT_W, 48, 10);
  ctx.fill();

  ctx.fillStyle = C.sub;
  ctx.font = `400 22px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`共 ${totalGames || 0} 局  ·  ${playerCount} 位牌友`, PAD + 20, y + 24);

  y += STATS_H + GAP;

  // 排名列表
  safeBoard.slice(0, 20).forEach((p, i) => {
    const isTop3 = i < 3;

    if (isTop3) {
      // 前三名：带名次徽章
      drawRankBadge(ctx, PAD + 28, y + ROW_H / 2, 44, i);
    } else {
      // 其他：数字排名
      ctx.fillStyle = C.weak;
      ctx.font = `500 22px ${NUM}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), PAD + 28, y + ROW_H / 2);
    }

    // 头像
    drawAvatar(ctx, PAD + 72, y + ROW_H / 2, 22, p.nickname, p.avatar_color);

    // 昵称
    ctx.fillStyle = C.text;
    ctx.font = `500 26px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.nickname, PAD + 104, y + ROW_H / 2 + 1);

    // 积分
    drawScore(ctx, W - PAD - 20, y + ROW_H / 2, p.points, 'right', 32);

    // 分隔线（最后一名不加）
    if (i < playerCount - 1) {
      ctx.save();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD + 20, y + ROW_H);
      ctx.lineTo(W - PAD - 20, y + ROW_H);
      ctx.stroke();
      ctx.restore();
    }

    y += ROW_H;
  });

  // 页脚
  drawFooter(ctx, totalH - FOOTER_H / 2);

  return toBlobUrl(cv);
}

// ============================================================
// 对战记录战报（多桌时间轴）
// ============================================================
export async function renderTablesPoster({ filteredTables: tables, tableSummary, aiEval, venueName }) {
  const HEADER_H = 200;
  const FOOTER_H = 80;
  const SUMMARY_H = 80;
  const AI_H = 100;
  const TABLE_CARD_H = 120;
  const GAP = 20;

  const maxTables = 10;
  const maxPlayers = 8;
  const safeTables = tables || [];
  const shown = safeTables.slice(0, maxTables);
  
  // Calculate height dynamically based on content
  const ROW_H = 56;
  const playerCount = tableSummary && tableSummary.players ? Math.min(tableSummary.players.length, maxPlayers) : 0;
  const summaryHeight = playerCount > 0 ? (30 + 48 + GAP + playerCount * ROW_H + GAP) : 0;
  // Calculate AI section height - use conservative char width (22px per CJK char)
  const aiLineHeight = 28;
  const aiMaxWidth = CONTENT_W - 80;
  const aiCharsPerLine = Math.floor(aiMaxWidth / 22); // Conservative: 22px per CJK char
  const aiLines = aiEval ? Math.max(1, Math.ceil(aiEval.length / aiCharsPerLine)) + 2 : 0; // +2 buffer lines
  const aiActualHeight = aiEval ? (60 + aiLines * aiLineHeight + 30) : 0;
  const aiHeight = aiActualHeight > 0 ? (aiActualHeight + GAP) : 0;
  const tablesHeight = shown.length * (TABLE_CARD_H + GAP);
  
  const totalH = HEADER_H + GAP + summaryHeight + aiHeight + tablesHeight + FOOTER_H;

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = totalH;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, totalH);

  drawHeader(ctx, '对战记录', `${safeTables.length} 桌`, venueName, totalH);

  let y = HEADER_H + GAP;

  // 战绩总结区域
  if (tableSummary && tableSummary.players && tableSummary.players.length > 0) {
    // 标题
    ctx.fillStyle = C.sub;
    ctx.font = `400 22px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('战绩总结', PAD, y);
    y += 16;

    // 统计信息
    ctx.fillStyle = C.card;
    roundRect(ctx, PAD, y, CONTENT_W, 48, 10);
    ctx.fill();

    ctx.fillStyle = C.sub;
    ctx.font = `400 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${tableSummary.tableCount || 0} 桌 · ${tableSummary.totalGames || 0} 局`, PAD + 20, y + 24);

    y += 56 + GAP;

    // 牌友排名（限制最多 8 人）
    const players = tableSummary.players.slice(0, maxPlayers);
    const ROW_H = 56;
    players.forEach((p, i) => {
      // 排名徽章
      if (i < 3) {
        drawRankBadge(ctx, PAD + 28, y + ROW_H / 2, 36, i);
      } else {
        ctx.fillStyle = C.weak;
        ctx.font = `500 20px ${NUM}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), PAD + 28, y + ROW_H / 2);
      }

      // 头像
      drawAvatar(ctx, PAD + 72, y + ROW_H / 2, 18, p.nickname, p.avatar_color);

      // 昵称
      ctx.fillStyle = C.text;
      ctx.font = `500 22px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.nickname, PAD + 100, y + ROW_H / 2 + 1);

      // 局数
      ctx.fillStyle = C.weak;
      ctx.font = `400 18px ${FONT}`;
      ctx.fillText(`${p.games || 0}局`, PAD + 180, y + ROW_H / 2 + 1);

      // 积分
      drawScore(ctx, W - PAD - 20, y + ROW_H / 2, p.points, 'right', 26);

      // 分隔线
      if (i < players.length - 1) {
        ctx.save();
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(PAD + 20, y + ROW_H);
        ctx.lineTo(W - PAD - 20, y + ROW_H);
        ctx.stroke();
        ctx.restore();
      }

      y += ROW_H;
    });

    y += GAP;
  }

  // AI 点评区域
  if (aiEval) {
    const aiCardHeight = 60 + aiLines * aiLineHeight + 20;
    ctx.fillStyle = C.card;
    roundRect(ctx, PAD, y, CONTENT_W, aiCardHeight, 10);
    ctx.fill();

    // AI 标签
    ctx.fillStyle = C.gold;
    ctx.font = `600 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(' AI 点评', PAD + 20, y + 16);

    // AI 文本（多行显示）
    ctx.fillStyle = C.sub;
    ctx.font = `400 18px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // 使用更可靠的多行文本渲染
    const maxWidth = CONTENT_W - 80;
    const lineHeight = 28; // 与高度计算一致
    let displayY = y + 44;
    
    // 按字符分割并测量
    let currentLine = '';
    for (let i = 0; i < aiEval.length; i++) {
      const char = aiEval[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine.length > 0) {
        ctx.fillText(currentLine, PAD + 20, displayY);
        currentLine = char;
        displayY += lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    // 绘制最后一行
    if (currentLine) {
      ctx.fillText(currentLine, PAD + 20, displayY);
    }

    y += aiCardHeight + GAP;
  }

  shown.forEach((t, idx) => {
    // 卡片背景
    ctx.fillStyle = C.card;
    roundRect(ctx, PAD, y, CONTENT_W, TABLE_CARD_H, 12);
    ctx.fill();

    // 日期 + 局数
    ctx.fillStyle = C.text;
    ctx.font = `600 26px ${NUM}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(t.played_date, PAD + 20, y + 18);

    ctx.fillStyle = C.weak;
    ctx.font = `400 20px ${FONT}`;
    ctx.fillText(`${t.rounds} 局`, PAD + 160, y + 22);

    // 分隔线
    ctx.save();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(PAD + 20, y + 56);
    ctx.lineTo(W - PAD - 20, y + 56);
    ctx.stroke();
    ctx.restore();

    // 玩家得分（2 列布局）
    const players = t.players || [];
    const colW = (CONTENT_W - 40) / 2;
    players.forEach((p, j) => {
      const col = j % 2;
      const row = Math.floor(j / 2);
      const px = PAD + 20 + col * colW;
      const py = y + 64 + row * 28;

      drawAvatar(ctx, px + 12, py + 10, 12, p.nickname, p.avatar_color);

      ctx.fillStyle = C.text;
      ctx.font = `400 20px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.nickname, px + 30, py + 11);

      drawScore(ctx, px + colW - 12, py + 10, p.points, 'right', 22);
    });

    y += TABLE_CARD_H + GAP;
  });

  if (tables.length > maxTables) {
    ctx.fillStyle = C.weak;
    ctx.font = `400 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`还有 ${tables.length - maxTables} 桌未展示`, W / 2, y + 10);
    y += 36;
  }

  drawFooter(ctx, totalH - FOOTER_H / 2);

  return toBlobUrl(cv);
}

// ============================================================
// 单桌战报
// ============================================================
export async function renderTablePoster({ dateLabel, rounds, totals, venueName }) {
  const HEADER_H = 200;
  const SECTION_GAP = 40;
  const TOTAL_ROW_H = 64;
  const ROUND_H = 100;
  const FOOTER_H = 80;

  const totalH = HEADER_H + SECTION_GAP + totals.length * TOTAL_ROW_H + SECTION_GAP + rounds.length * ROUND_H + FOOTER_H;

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = totalH;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, totalH);

  drawHeader(ctx, '单桌战报', dateLabel || '', venueName, totalH);

  let y = HEADER_H + SECTION_GAP;

  // 累计积分标题
  ctx.fillStyle = C.sub;
  ctx.font = `400 22px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('本桌累计', PAD, y);
  y += 16;

  // 累计积分行
  totals.forEach((p) => {
    drawAvatar(ctx, PAD + 20, y + TOTAL_ROW_H / 2, 20, p.nickname, p.avatar_color);

    ctx.fillStyle = C.text;
    ctx.font = `500 26px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.nickname, PAD + 52, y + TOTAL_ROW_H / 2 + 1);

    drawScore(ctx, W - PAD - 20, y + TOTAL_ROW_H / 2, p.points, 'right', 32);

    y += TOTAL_ROW_H;
  });

  y += SECTION_GAP - 16;

  // 分隔线
  drawDivider(ctx, y);
  y += 24;

  // 逐局记录
  rounds.forEach((r) => {
    // 局数标题
    ctx.fillStyle = C.sub;
    ctx.font = `400 22px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`第 ${r.round_num} 局${r.played_time ? ` · ${r.played_time}` : ''}`, PAD, y);
    y += 32;

    // 玩家得分（2 列）
    const colW = CONTENT_W / 2;
    r.scores.forEach((p, j) => {
      const col = j % 2;
      const row = Math.floor(j / 2);
      const px = PAD + col * colW;
      const py = y + row * 32;

      drawAvatar(ctx, px + 16, py + 12, 14, p.nickname, p.avatar_color);

      ctx.fillStyle = C.text;
      ctx.font = `400 22px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.nickname, px + 38, py + 13);

      drawScore(ctx, px + colW - 16, py + 12, p.points, 'right', 24);
    });

    y += ROUND_H;
  });

  drawFooter(ctx, totalH - FOOTER_H / 2);

  return toBlobUrl(cv);
}

// ============================================================
// 保存 / 下载
// ============================================================
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
// Force rebuild Tue Sep 22 16:31:36 CST 2026
