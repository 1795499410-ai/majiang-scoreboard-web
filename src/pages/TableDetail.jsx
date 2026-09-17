import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil, Trash2, Plus, Share2 } from 'lucide-react';
import { getTableDetail, deleteGame } from '../lib/db';
import { Avatar, Score, Loading, Empty, ErrorBox, useToast } from '../components/ui';
import PosterModal from '../components/PosterModal';
import { renderTablePoster } from '../lib/poster';
import { useAuth } from '../lib/auth';

export default function TableDetail() {
  const { tableId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { venueName } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [poster, setPoster] = useState(false);

  const buildPoster = useCallback(
    () => renderTablePoster({
      dateLabel: data?.played_date || '',
      rounds: data?.rounds || [],
      totals: data?.totals || [],
      venueName
    }),
    [data, venueName]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getTableDetail(tableId));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => { load(); }, [load]);

  const doDelete = async (gameId, roundNum) => {
    if (busy) return;
    if (!window.confirm(`删除第 ${roundNum} 局？`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteGame(gameId);
      toast('已删除');
      const next = await getTableDetail(tableId);
      if (!next.rounds.length) nav('/', { replace: true });
      else setData(next);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="page page-nobar"><Loading /></div>;

  return (
    <div className="page page-nobar page-table">
      <div className="felt-bg" aria-hidden="true">
        <span className="felt-ring" />
        <span className="felt-center">局</span>
      </div>
      <div className="sub-head">
        <button className="sub-back" onClick={() => nav('/')} aria-label="返回">
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <span className="sub-title num">{data?.played_date}</span>
        <span className="sub-extra">{data?.rounds.length ?? 0}局</span>
        {data?.rounds.length > 0 && (
          <button className="icon-btn" onClick={() => setPoster(true)} aria-label="生成战报">
            <Share2 size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="page-inner">
        <ErrorBox error={error} onRetry={load} />

        {!data || data.rounds.length === 0 ? (
          <Empty text="本桌没有记录" />
        ) : (
          <>
            <div className="card">
              <div className="field-label">本桌累计</div>
              {data.totals.map((p) => (
                <div className="row" key={p.player_id}>
                  <Avatar nickname={p.nickname} colorIndex={p.avatar_color} size="sm" />
                  <div className="row-main">
                    <div className="row-title">{p.nickname}</div>
                  </div>
                  <Score value={p.points} style={{ fontSize: 'var(--fs-num-md)' }} />
                </div>
              ))}
            </div>

            {data.rounds.map((r) => (
              <div className="card" key={r.game_id}>
                <div className="round-head">
                  <span className="field-label" style={{ margin: 0 }}>
                    第{r.round_num}局 {r.played_time && `· ${r.played_time}`}
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--s1)' }}>
                    <button
                      className="icon-btn"
                      onClick={() => nav(`/record?edit=${r.game_id}&table=${tableId}`)}
                      aria-label="编辑"
                    >
                      <Pencil size={15} strokeWidth={1.5} />
                    </button>
                    <button className="icon-btn" onClick={() => doDelete(r.game_id, r.round_num)} aria-label="删除">
                      <Trash2 size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                <div className="round-scores">
                  {r.scores.map((s) => (
                    <div className="round-score" key={s.player_id}>
                      <span className="round-nick">{s.nickname}</span>
                      <Score value={s.points} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="fixed-bottom-nobar">
        <button className="btn btn-primary" onClick={() => nav(`/record?table=${tableId}`)}>
          <Plus size={18} strokeWidth={2} />新增一局
        </button>
      </div>

      {poster && (
        <PosterModal
          render={buildPoster}
          filename={`本桌战报-${data?.played_date || ''}.png`}
          onClose={() => setPoster(false)}
        />
      )}
    </div>
  );
}
