import { NavLink, Outlet } from 'react-router-dom';
import {
  Bot,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Siren,
  UserCog,
  Users,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { roleLabels } from '../utils/labels.js';
import ThemeToggle from '../components/ThemeToggle.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/incidents', label: 'Incidents', icon: Siren },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/ai-assistant', label: 'AI Assistant', icon: Bot },
  { to: '/activity-log', label: 'Activity Log', icon: ScrollText, roles: ['admin'] },
  { to: '/admin/users', label: 'Users', icon: UserCog, roles: ['admin'] },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <HeartPulse size={24} aria-hidden="true" />
          <span>Emergency Response</span>
        </div>
        <nav className="nav" aria-label="Main navigation">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="nav-link">
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <div className="disclaimer-bar">
          Academic prototype: synthetic data only. Not a clinical or production emergency system.
        </div>
        <header className="topbar">
          <div className="topbar-user">
            <strong>{user.fullName}</strong>
            <span className="badge badge-info">{roleLabels[user.role] ?? user.role}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThemeToggle />
            <button type="button" className="btn btn-ghost" onClick={logout}>
              <LogOut size={16} aria-hidden="true" /> Log out
            </button>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}