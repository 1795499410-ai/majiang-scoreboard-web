import { NavLink } from 'react-router-dom';
import { Trophy, Users, Sparkles, User } from 'lucide-react';

const items = [
  { to: '/', label: '榜单', Icon: Trophy, end: true },
  { to: '/players', label: '牌友', Icon: Users },
  { to: '/ai', label: 'AI', Icon: Sparkles },
  { to: '/me', label: '我的', Icon: User }
];

export default function TabBar() {
  return (
    <nav className="tabbar">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `tabbar-item ${isActive ? 'active' : ''}`}
        >
          <Icon size={20} strokeWidth={1.5} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
