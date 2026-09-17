import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Share2 } from 'lucide-react';
import { getLeaderboard, getTableList } from '../lib/db';
import { Avatar, Score, Loading, ErrorBox, RankDelta } from '../components/ui';
import { getSnapshot, saveSnapshot, annotate, hasChanged, markWritten } from '../lib/rankTrack';
import { SceneHeader, WoodFrame, MahjongTile, EmptyPanda, GoldTitle } from '../components/decor';
import PosterModal from '../components/PosterModal';
import { renderDailyPoster } from '../lib/poster';
import { formatDate } from '../lib/model';
import { useAuth } from '../lib/auth';

const SCOPES = [
  { key: 'daily', label: '今日' },
  { key: 'weekly', label: '本周' },
  { key: 'total', label: '总榜' }
];
const SCOPE_LABEL = { daily: '今日战报', weekly: '本周战报', total: '总榜战报' };
const MEDAL_CHAR = ['冠', '亚', '季'];

export default function Leaderboard() {
  const nav = useNavigate();
  const { venueName } = useAuth();
  const [scope, setScope] = useState('total');
  const [view, setView] = useState('board');
  const [board, setBoard] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [poster, setPoster] = useState(false);

  const [animate, setAnimate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, t] = await Promise.all([getLeaderboard(scope), getTableList()]);
      const snap = getSnapshot(scope);
      const changed = hasChanged(b, snap);

      // 渲染永远执行；去重只决定「要不要播动画」，绝不能阻断 setBoard。
      // 此前把渲染也挡在去重之后，导致相同数据二次进入时榜单渲染成空态。
      const first = markWritten(scope, b);
      setBoard(annotate(b, snap));
      setAnimate(changed && first);
      if (first) saveSnapshot(scope, b);
      setTables(t);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  const top3 = board.slice(0, 3);
  const rest = board.slice(3);
  const podiumOrder = [1, 0, 2].filter((i) => top3[i]);

  const gameCount = tables.reduce((s, t) => {
    if (scope === 'daily') return t.played_date === formatDate() ? s + t.rounds : s;
    return s + t.rounds;
  }, 0);

  const buildPoster = useCallback(
    () => renderDailyPoster({
      dateLabel: scope === 'total' ? '全部战绩' : scope === 'weekly' ? '本周战绩' : formatDate(),
      board,
      totalGames: gameCount,
      venueName
    }),
    [board, scope, gameCount, venueName]
  );

  return (
    <div className="page page-rich">
      <SceneHeader />

      <GoldTitle
        slogan="参与对战，排名实时更新"
        sub={gameCount > 0 ? `已记录 ${gameCount} 局 · ${board.length} 位牌友同台` : '今日谁是牌桌之王，见分晓'}
      >
        麻友排行榜
      </GoldTitle>

      <div className="switch-bar">
        <div className="switch-group">
          <button className={`switch-item ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}>
            积分排名
          </button>
          <button className={`switch-item ${view === 'tables' ? 'active' : ''}`} onClick={() => setView('tables')}>
            对战记录
          </button>
        </div>
        {board.length > 0 && (
          <button className="share-btn" onClick={() => setPoster(true)} aria-label="生成战报">
            <Share2 size={15} strokeWidth={1.8} />
            <span>战报</span>
          </button>
        )}
      </div>

      <div className="page-inner">
        <ErrorBox error={error} onRetry={load} />
      </div>

      {view === 'board' && (
        <>
          <div className="tabs scope-tabs">
            {SCOPES.map((s) => (
              <button
                key={s.key}
                className={`tab-pill ${scope === s.key ? 'active' : ''}`}
                onClick={() => setScope(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {loading ? (
            <Loading />
          ) : board.length === 0 ? (
            <div className="page-inner">
              <WoodFrame title="虚位以待">
                <EmptyPanda text="还没有对局记录" hint="记下第一局，排行榜就活了">
                  <button className="btn btn-gold" style={{ maxWidth: 220, margin: '0 auto' }} onClick={() => nav('/record')}>
                    记一局
                  </button>
                </EmptyPanda>
              </WoodFrame>
            </div>
          ) : (
            <div className="page-inner">
              {top3.length > 0 && (
                <WoodFrame title="风云榜" tone="stage">
                  <div className="podium">
                    {podiumOrder.map((idx, pos) => {
                      const p = top3[idx];
                      return (
                        <div className={`podium-item podium-rank-${idx}`} key={p.player_id}>
                          <div className="crown-wrap">
                            <span className={`crown crown-${idx}`}>{MEDAL_CHAR[idx]}</span>
                            {idx === 0 && <span className="crown-ray" />}
                          </div>
                          <MahjongTile rank={idx} flipDelay={pos * 140}>
                            <div className="mj-rank">
                              {idx + 1}
                              <RankDelta delta={p.rankDelta} />
                            </div>
                            <Avatar nickname={p.nickname} colorIndex={p.avatar_color} />
                            <div className="mj-name">{p.nickname}</div>
                            <Score value={p.points} className="mj-score" from={animate ? p.pointsFrom : undefined} />
                            <div className="mj-meta">{p.games}局 · {p.win_rate}%</div>
                          </MahjongTile>
                        </div>
                      );
                    })}
                  </div>
                </WoodFrame>
              )}

              {rest.length > 0 && (
                <WoodFrame title="群雄谱">
                  <div className="rank-list">
                    {rest.map((p, i) => (
                      <div
                        className={`rank-row stagger ${p.rankDelta > 0 ? 'row-up' : p.rankDelta < 0 ? 'row-down' : ''}`}
                        key={p.player_id}
                        style={{ animationDelay: `${i * 55}ms` }}
                      >
                        <div className="rank-no num">{i + 4}</div>
                        <Avatar nickname={p.nickname} colorIndex={p.avatar_color} size="sm" />
                        <div className="row-main">
                          <div className="row-title">
                            {p.nickname}
                            <RankDelta delta={p.rankDelta} />
                          </div>
                          <div className="row-sub">{p.games}局 · 胜率{p.win_rate}%</div>
                        </div>
                        <Score value={p.points} className="rank-score" from={animate ? p.pointsFrom : undefined} />
                      </div>
                    ))}
                  </div>
                </WoodFrame>
              )}
            </div>
          )}
        </>
      )}

      {view === 'tables' && (
        <div className="page-inner">
          {loading ? (
            <Loading />
          ) : tables.length === 0 ? (
            <WoodFrame title="尚无战绩">
              <EmptyPanda text="还没有对战记录" hint="记录一局后这里会显示每一桌的明细">
                <button className="btn btn-gold" style={{ maxWidth: 220, margin: '0 auto' }} onClick={() => nav('/record')}>
                  记一局
                </button>
              </EmptyPanda>
            </WoodFrame>
          ) : (
            <WoodFrame title="对战记录">
              <div className="rank-list">
                {tables.map((t, i) => (
                  <button
                    key={t.table_id}
                    className="table-row stagger"
                    style={{ animationDelay: `${i * 55}ms` }}
                    onClick={() => nav(`/table/${t.table_id}`)}
                  >
                    <div className="table-row-head">
                      <span className="table-row-date num">{t.played_date}</span>
                      <span className="table-row-rounds">{t.rounds}局</span>
                      <ChevronRight size={16} strokeWidth={1.5} color="var(--c-text-weak)" />
                    </div>
                    <div className="table-row-players">
                      {t.players.map((p) => (
                        <span className="table-row-player" key={p.player_id}>
                          <Avatar nickname={p.nickname} colorIndex={p.avatar_color} size="sm" />
                          <span className="table-row-nick">{p.nickname}</span>
                          <Score value={p.points} />
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </WoodFrame>
          )}
        </div>
      )}

      {/* 空态已在卡片内给了入口，此处隐藏 FAB，避免同屏两个「记一局」 */}
      {!loading && board.length > 0 && (
        <button className="fab fab-gold" onClick={() => nav('/record')} aria-label="记一局">
          <Plus size={22} strokeWidth={2.2} />
          <span>记一局</span>
        </button>
      )}

      {poster && (
        <PosterModal
          render={buildPoster}
          filename={`${SCOPE_LABEL[scope]}-${formatDate()}.png`}
          onClose={() => setPoster(false)}
        />
      )}
    </div>
  );
}
