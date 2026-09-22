import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { getPlayers, addPlayer, addPlayersBatch, updatePlayer, deletePlayer, getPlayerStats } from '../lib/db';
import { Avatar, Score, Empty, Loading, Modal, Sheet, ErrorBox, useToast } from '../components/ui';
import { MiniScene, WoodFrame, GoldTitle, EmptyPanda } from '../components/decor';

export default function Players() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [batchMode, setBatchMode] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRemark, setEditRemark] = useState('');

  const [detail, setDetail] = useState(null);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await getPlayers());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAdd = async () => {
    const raw = newName.trim();
    if (!raw || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (batchMode) {
        const names = raw.split(/[\s,，、\n]+/).filter(Boolean);
        if (!names.length) return;
        await addPlayersBatch(names);
        toast(`已添加 ${names.length} 位`);
      } else {
        await addPlayer(raw);
        toast('已添加');
      }
      setNewName('');
      setShowAdd(false);
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (p) => {
    setEditing(p);
    setEditName(p.nickname);
    setEditRemark(p.remark || '');
  };

  const doEdit = async () => {
    if (!editName.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updatePlayer(editing.id, { nickname: editName.trim(), remark: editRemark.trim() });
      setEditing(null);
      toast('已保存');
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (p) => {
    if (busy) return;
    if (!window.confirm(`删除「${p.nickname}」？其历史对局记录会一并删除。`)) return;
    setBusy(true);
    setError(null);
    try {
      await deletePlayer(p.id);
      setEditing(null);
      setDetail(null);
      toast('已删除');
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (p) => {
    setDetail(p);
    setStats(null);
    try {
      setStats(await getPlayerStats(p.id));
    } catch (e) {
      setError(e);
    }
  };

  const filtered = q.trim()
    ? list.filter((p) => p.nickname.includes(q.trim()) || (p.remark || '').includes(q.trim()))
    : list;

  return (
    <div className="page page-rich page-sub-rich">
      <MiniScene variant="players" />
      <GoldTitle size="sm" sub={list.length ? `${list.length} 位牌友在册` : '还没有牌友'}>
        牌友名册
      </GoldTitle>

      <div className="page-inner">
        <div className="search-box">
          <Search size={16} strokeWidth={1.5} color="var(--c-text-weak)" />
          <input
            className="search-input"
            placeholder="搜索昵称或备注"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <ErrorBox error={error} onRetry={load} />

        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <WoodFrame title={q ? '查无此人' : '虚位以待'}>
            <EmptyPanda
              text={q ? '没有匹配的牌友' : '还没有牌友'}
              hint={q ? '换个关键词试试' : '添加牌友后即可开始记分'}
            >
              {!q && (
                <button className="btn btn-gold" style={{ maxWidth: 220, margin: '0 auto' }} onClick={() => setShowAdd(true)}>
                  添加牌友
                </button>
              )}
            </EmptyPanda>
          </WoodFrame>
        ) : (
          <WoodFrame title="名册">
            {filtered.map((p, i) => (
              <div className="tile-row" key={p.id}>
                <div className="tile-row-inner" style={{ animationDelay: `${i * 60}ms` }} onClick={() => openDetail(p)}>
                  <Avatar nickname={p.nickname} colorIndex={p.avatar_color} />
                  <div className="row-main">
                    <div className="row-title">{p.nickname}</div>
                    {p.remark && <div className="row-sub">{p.remark}</div>}
                  </div>
                  <button className="tile-edit-btn" onClick={(e) => { e.stopPropagation(); openEdit(p); }} aria-label="编辑">
                    <Pencil size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </WoodFrame>
        )}
      </div>

      {filtered.length > 0 && (
      <button className="fab fab-gold" onClick={() => setShowAdd(true)} aria-label="新增牌友">
        <Plus size={22} strokeWidth={2.2} />
        <span>新增</span>
      </button>
      )}

      {showAdd && (
        <Modal
          title="新增牌友"
          onClose={() => setShowAdd(false)}
          actions={
            <>
              <button className="btn btn-outline" onClick={() => setShowAdd(false)} disabled={busy}>取消</button>
              <button className="btn btn-primary" onClick={doAdd} disabled={busy || !newName.trim()}>
                {busy ? '添加中…' : '添加'}
              </button>
            </>
          }
        >
          {batchMode ? (
            <textarea
              className="input"
              style={{ height: 96, padding: 'var(--s3)', resize: 'none' }}
              placeholder="多个昵称用空格或逗号分隔"
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
            />
          ) : (
            <input
              className="input"
              placeholder="昵称"
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doAdd()}
            />
          )}
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 'var(--s2)' }}
            onClick={() => setBatchMode((v) => !v)}
          >
            {batchMode ? '切换单个添加' : '批量添加多位'}
          </button>
        </Modal>
      )}

      {editing && (
        <Modal
          title="编辑牌友"
          onClose={() => setEditing(null)}
          actions={
            <>
              <button className="btn btn-danger" onClick={() => doDelete(editing)} disabled={busy}>
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
              <button className="btn btn-outline" onClick={() => setEditing(null)} disabled={busy}>取消</button>
              <button className="btn btn-primary" onClick={doEdit} disabled={busy || !editName.trim()}>
                {busy ? '保存中…' : '保存'}
              </button>
            </>
          }
        >
          <div className="field">
            <label className="field-label">昵称</label>
            <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">备注</label>
            <input className="input" placeholder="选填" value={editRemark} onChange={(e) => setEditRemark(e.target.value)} />
          </div>
        </Modal>
      )}

      {detail && (
        <Sheet onClose={() => setDetail(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
            <Avatar nickname={detail.nickname} colorIndex={detail.avatar_color} size="lg" />
            <div>
              <div style={{ fontSize: 'var(--fs-h2)', fontWeight: 600 }}>{detail.nickname}</div>
              {detail.remark && <div className="row-sub">{detail.remark}</div>}
            </div>
          </div>

          {!stats ? (
            <Loading />
          ) : (
            <>
              <div className="stat-grid">
                <div className="stat-cell">
                  <Score value={stats.total_points} className="stat-num" />
                  <div className="stat-label">总积分</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-num num">{stats.total_games}</div>
                  <div className="stat-label">总局数</div>
                </div>
                <div className="stat-cell">
                  <div className="stat-num num">{stats.win_rate}%</div>
                  <div className="stat-label">胜率</div>
                </div>
              </div>

              <div className="divider" />
              <div className="field-label">最近对局</div>
              {stats.recent.length === 0 ? (
                <Empty text="暂无对局" />
              ) : (
                stats.recent.map((r) => (
                  <div className="row" key={r.game_id}>
                    <div className="row-main">
                      <div className="row-title num" style={{ fontSize: 'var(--fs-body)' }}>{r.played_date}</div>
                      <div className="row-sub">
                        {r.all_players.map((x) => x.nickname).join(' · ')}
                      </div>
                    </div>
                    <Score value={r.points} style={{ fontSize: 'var(--fs-num-md)' }} />
                  </div>
                ))
              )}
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
