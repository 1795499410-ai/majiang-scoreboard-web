/**
 * 数据服务层 —— 重写自小程序 miniprogram/utils/db.js
 * 隔离由数据库 RLS 强制，owner_id 由 BEFORE INSERT 触发器自动填充，
 * 前端不传也无法伪造。这里不做任何 owner 过滤。
 */
import { supabase } from './supabase';
import { deriveResult, formatDate, formatTime, weekStart, uid } from './model';

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data || [];
}

/* ---------- 牌友 ---------- */

export async function getPlayers() {
  return unwrap(
    await supabase
      .from('players')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true })
  );
}

export async function addPlayer(nickname, remark = '') {
  const existing = await getPlayers();
  const { data, error } = await supabase
    .from('players')
    .insert({
      nickname: String(nickname).trim(),
      remark,
      avatar_color: existing.length % 8
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addPlayersBatch(nicknames) {
  const existing = await getPlayers();
  const rows = nicknames.map((n, i) => ({
    nickname: String(n).trim(),
    remark: '',
    avatar_color: (existing.length + i) % 8
  }));
  return unwrap(await supabase.from('players').insert(rows).select());
}

export async function updatePlayer(id, patch) {
  const { error } = await supabase.from('players').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deletePlayer(id) {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ---------- 对局写入 ---------- */

/**
 * 新增一局。entries: [{ player_id, points }]
 * tableId 为空则开新桌
 */
export async function addGame({ entries, playedDate, tableId }) {
  const now = new Date();
  const { data: game, error: gErr } = await supabase
    .from('games')
    .insert({
      table_id: tableId || uid(),
      played_date: playedDate || formatDate(now),
      played_time: formatTime(now)
    })
    .select()
    .single();
  if (gErr) throw new Error(gErr.message);

  const rows = entries.map((e) => ({
    game_id: game.id,
    player_id: e.player_id,
    points: Number(e.points) || 0,
    result: deriveResult(e.points)
  }));
  const { error: sErr } = await supabase.from('scores').insert(rows);
  if (sErr) {
    // 积分写失败则回滚 game，避免留下空局
    await supabase.from('games').delete().eq('id', game.id);
    throw new Error(sErr.message);
  }
  return game;
}

export async function updateGame(gameId, { entries, playedDate }) {
  if (playedDate) {
    const { error } = await supabase
      .from('games')
      .update({ played_date: playedDate })
      .eq('id', gameId);
    if (error) throw new Error(error.message);
  }
  const { error: dErr } = await supabase.from('scores').delete().eq('game_id', gameId);
  if (dErr) throw new Error(dErr.message);

  const rows = entries.map((e) => ({
    game_id: gameId,
    player_id: e.player_id,
    points: Number(e.points) || 0,
    result: deriveResult(e.points)
  }));
  const { error: iErr } = await supabase.from('scores').insert(rows);
  if (iErr) throw new Error(iErr.message);
}

// scores 有 on delete cascade，删 game 即连带删分
export async function deleteGame(gameId) {
  const { error } = await supabase.from('games').delete().eq('id', gameId);
  if (error) throw new Error(error.message);
}

export async function deleteTable(tableId) {
  const { error } = await supabase.from('games').delete().eq('table_id', tableId);
  if (error) throw new Error(error.message);
}

/* ---------- 聚合查询 ---------- */

function playerMapOf(players) {
  const m = {};
  players.forEach((p) => { m[p.id] = p; });
  return m;
}

/** 榜单聚合。scope: daily | weekly | total */
export async function getLeaderboard(scope = 'total') {
  let q = supabase.from('games').select('id');
  if (scope === 'daily') q = q.eq('played_date', formatDate());
  else if (scope === 'weekly') q = q.gte('played_date', weekStart());

  const games = unwrap(await q);
  if (!games.length) return [];

  const gameIds = games.map((g) => g.id);
  const [scores, players] = await Promise.all([
    unwrap(await supabase.from('scores').select('*').in('game_id', gameIds)),
    getPlayers()
  ]);

  const pm = playerMapOf(players);
  const stats = {};
  scores.forEach((s) => {
    if (!stats[s.player_id]) stats[s.player_id] = { points: 0, games: 0, wins: 0 };
    stats[s.player_id].points += s.points;
    stats[s.player_id].games += 1;
    if (s.result === 'win') stats[s.player_id].wins += 1;
  });

  return Object.keys(stats)
    .map((pid) => {
      const p = pm[pid] || {};
      const s = stats[pid];
      return {
        player_id: pid,
        nickname: p.nickname || '已删除',
        avatar_color: p.avatar_color ?? 0,
        points: s.points,
        games: s.games,
        wins: s.wins,
        win_rate: s.games ? Math.round((s.wins / s.games) * 100) : 0
      };
    })
    .sort((a, b) => b.points - a.points);
}

/** 按桌聚合的对局列表 */
export async function getTableList(limit = 100) {
  const games = unwrap(
    await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
  );
  if (!games.length) return [];

  const gameIds = games.map((g) => g.id);
  const [scores, players] = await Promise.all([
    unwrap(await supabase.from('scores').select('*').in('game_id', gameIds)),
    getPlayers()
  ]);
  const pm = playerMapOf(players);

  const tables = {};
  games.forEach((g) => {
    if (!tables[g.table_id]) {
      tables[g.table_id] = {
        table_id: g.table_id,
        played_date: g.played_date,
        created_at: g.created_at,
        gameIds: []
      };
    }
    tables[g.table_id].gameIds.push(g.id);
    if (g.created_at > tables[g.table_id].created_at) {
      tables[g.table_id].created_at = g.created_at;
    }
  });

  return Object.values(tables)
    .map((t) => {
      const totals = {};
      scores
        .filter((s) => t.gameIds.includes(s.game_id))
        .forEach((s) => {
          if (!totals[s.player_id]) {
            const p = pm[s.player_id] || {};
            totals[s.player_id] = {
              player_id: s.player_id,
              nickname: p.nickname || '已删除',
              avatar_color: p.avatar_color ?? 0,
              points: 0
            };
          }
          totals[s.player_id].points += s.points;
        });
      return {
        table_id: t.table_id,
        played_date: t.played_date,
        created_at: t.created_at,
        rounds: t.gameIds.length,
        players: Object.values(totals).sort((a, b) => b.points - a.points)
      };
    })
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

/** 单桌每局明细 */
export async function getTableDetail(tableId) {
  const games = unwrap(
    await supabase
      .from('games')
      .select('*')
      .eq('table_id', tableId)
      .order('created_at', { ascending: true })
  );
  if (!games.length) return { rounds: [], totals: [], played_date: '' };

  const gameIds = games.map((g) => g.id);
  const [scores, players] = await Promise.all([
    unwrap(await supabase.from('scores').select('*').in('game_id', gameIds)),
    getPlayers()
  ]);
  const pm = playerMapOf(players);

  const rounds = games.map((g, i) => ({
    game_id: g.id,
    round_num: i + 1,
    played_time: g.played_time || '',
    played_date: g.played_date,
    scores: scores
      .filter((s) => s.game_id === g.id)
      .sort((a, b) => b.points - a.points)
      .map((s) => ({
        player_id: s.player_id,
        nickname: (pm[s.player_id] || {}).nickname || '已删除',
        avatar_color: (pm[s.player_id] || {}).avatar_color ?? 0,
        points: s.points
      }))
  }));

  const totals = {};
  scores.forEach((s) => {
    if (!totals[s.player_id]) {
      const p = pm[s.player_id] || {};
      totals[s.player_id] = {
        player_id: s.player_id,
        nickname: p.nickname || '已删除',
        avatar_color: p.avatar_color ?? 0,
        points: 0
      };
    }
    totals[s.player_id].points += s.points;
  });

  return {
    table_id: tableId,
    played_date: games[0].played_date,
    rounds,
    totals: Object.values(totals).sort((a, b) => b.points - a.points)
  };
}

/** 最近一桌的参与者，用于「上一桌」快捷复用 */
export async function getLastGroup() {
  const games = unwrap(
    await supabase
      .from('games')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
  );
  if (!games.length) return [];
  const scores = unwrap(
    await supabase.from('scores').select('player_id').eq('game_id', games[0].id)
  );
  return scores.map((s) => s.player_id);
}

/** 个人战绩 —— 原实现有 N+1 查询，这里改为两次查询 */
export async function getPlayerStats(playerId) {
  const mine = unwrap(
    await supabase.from('scores').select('*').eq('player_id', playerId)
  );
  if (!mine.length) {
    return { total_points: 0, total_games: 0, wins: 0, win_rate: 0, recent: [] };
  }

  const gameIds = [...new Set(mine.map((s) => s.game_id))];
  const [games, allScores, players] = await Promise.all([
    unwrap(
      await supabase
        .from('games')
        .select('*')
        .in('id', gameIds)
        .order('created_at', { ascending: false })
        .limit(10)
    ),
    unwrap(await supabase.from('scores').select('*').in('game_id', gameIds)),
    getPlayers()
  ]);
  const pm = playerMapOf(players);

  const recent = games.map((g) => {
    const own = mine.find((s) => s.game_id === g.id);
    return {
      game_id: g.id,
      table_id: g.table_id,
      played_date: g.played_date,
      played_time: g.played_time || '',
      points: own ? own.points : 0,
      result: own ? own.result : 'draw',
      all_players: allScores
        .filter((s) => s.game_id === g.id)
        .sort((a, b) => b.points - a.points)
        .map((s) => ({
          player_id: s.player_id,
          nickname: (pm[s.player_id] || {}).nickname || '已删除',
          avatar_color: (pm[s.player_id] || {}).avatar_color ?? 0,
          points: s.points
        }))
    };
  });

  const wins = mine.filter((s) => s.result === 'win').length;
  return {
    total_points: mine.reduce((sum, s) => sum + s.points, 0),
    total_games: gameIds.length,
    wins,
    win_rate: gameIds.length ? Math.round((wins / gameIds.length) * 100) : 0,
    recent
  };
}

/** AI 查询所需的全量快照 */
export async function getSnapshot() {
  const [players, games, scores] = await Promise.all([
    getPlayers(),
    unwrap(await supabase.from('games').select('*')),
    unwrap(await supabase.from('scores').select('*'))
  ]);
  return { players, games, scores };
}
