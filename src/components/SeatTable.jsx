/**
 * 牌桌俯视图 —— 环形座位选择器
 * 2-8 人自动布局，选中座位带翻转动画
 */
import { Avatar } from './ui';

const SEAT_POSITIONS = {
  2: [[50, 12], [50, 88]],
  3: [[50, 12], [18, 78], [82, 78]],
  4: [[50, 8], [92, 50], [50, 92], [8, 50]],
  5: [[50, 6], [88, 30], [82, 82], [18, 82], [12, 30]],
  6: [[50, 6], [87, 25], [87, 75], [50, 94], [13, 75], [13, 25]],
  7: [[50, 5], [82, 15], [93, 50], [82, 85], [50, 95], [18, 85], [7, 50]],
  8: [[50, 5], [82, 12], [95, 38], [95, 62], [82, 88], [50, 95], [18, 88], [5, 62], [5, 38], [18, 12]],
};

function getPositions(count) {
  if (count <= 8) return SEAT_POSITIONS[count] || SEAT_POSITIONS[4];
  // 9+ 人：动态计算
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = 50 + 40 * Math.cos(angle);
    const y = 50 + 40 * Math.sin(angle);
    positions.push([x, y]);
  }
  return positions;
}

export default function SeatTable({ players, selected, onToggle }) {
  const count = Math.max(2, Math.min(players.length, 8));
  const positions = getPositions(count);
  const displayPlayers = players.slice(0, count);

  return (
    <div className="felt-table">
      <div className="felt-surface">
        <div className="felt-center-ring" />
      </div>
      {displayPlayers.map((p, i) => {
        const [x, y] = positions[i];
        const isSelected = selected.includes(p.id);
        return (
          <div
            key={p.id}
            className={`seat seat-pos-${i} ${isSelected ? 'selected' : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onToggle(p.id)}
          >
            <div className="seat-token">
              {isSelected ? (
                <Avatar nickname={p.nickname} colorIndex={p.avatar_color} size="sm" />
              ) : (
                <span style={{ fontSize: '10px', opacity: .5 }}>空</span>
              )}
            </div>
            <div className="seat-label">{p.nickname}</div>
          </div>
        );
      })}
    </div>
  );
}
