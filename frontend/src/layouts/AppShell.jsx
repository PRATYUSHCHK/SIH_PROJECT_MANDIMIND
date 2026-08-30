import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  LayoutDashboard,
  LineChart,
  Boxes,
  Sparkles,
  SlidersHorizontal,
  Map,
  Tractor,
  Activity,
  Settings,
  Search,
  Moon,
  Sun,
  LogOut,
  Store,
  Zap,
  Truck,
  Receipt,
} from 'lucide-react';
import { Logo } from '../components/Logo.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['seller', 'farmer', 'admin'] },
  { to: '/marketplace', label: 'Marketplace', icon: Store, roles: ['seller', 'farmer', 'admin', 'buyer'] },
  { to: '/matches', label: 'AI Matches', icon: Zap, roles: ['seller', 'farmer', 'admin', 'buyer'] },
  { to: '/intelligence', label: 'Market Intelligence', icon: LineChart, roles: ['seller', 'admin'] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['seller', 'admin'] },
  { to: '/recommendations', label: 'Recommendations', icon: Sparkles, roles: ['seller', 'admin'] },
  { to: '/logistics', label: 'Logistics', icon: Truck, roles: ['seller', 'farmer', 'admin', 'buyer'] },
  { to: '/map', label: 'Market Map', icon: Map, roles: ['seller', 'farmer', 'admin', 'buyer'] },
  { to: '/forecasts', label: 'Forecasts', icon: Activity, roles: ['seller', 'admin'] },
  { to: '/transactions', label: 'Transactions', icon: Receipt, roles: ['seller', 'farmer', 'admin', 'buyer'] },
  { to: '/farmer', label: 'Farmer Mode', icon: Tractor, roles: ['farmer', 'admin', 'seller'] },
  { to: '/simulator', label: 'What-If Simulator', icon: SlidersHorizontal, roles: ['seller', 'admin'] },
  { to: '/alerts', label: 'Alerts', icon: Bell, roles: ['seller', 'farmer', 'admin'] },
  { to: '/models', label: 'Model Performance', icon: Activity, roles: ['admin', 'seller'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['seller', 'farmer', 'admin', 'buyer'] },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const items = NAV.filter((n) => n.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-canvas text-ink dark:bg-night-bg dark:text-night-text">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-line bg-white dark:border-night-mute/20 dark:bg-night-card md:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-forest text-white' : 'text-mute hover:bg-earth dark:hover:bg-night-lift'}`
              }
            >
              <n.icon size={16} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-4 dark:border-night-mute/20">
          <div className="text-sm font-semibold">{user?.name}</div>
          <div className="text-xs uppercase tracking-wide text-mute">{user?.role}</div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-3 flex items-center gap-2 text-sm text-mute hover:text-ink"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <div className="md:pl-[260px]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur dark:border-night-mute/20 dark:bg-night-card/90">
          <div className="md:hidden">
            <Logo compact />
          </div>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-mute" />
            <input aria-label="Search" placeholder="Search commodities, mandis, alerts" className="w-full rounded-full border border-line bg-canvas py-2 pl-9 pr-3 text-sm dark:border-night-mute/20 dark:bg-night-lift" />
          </div>
          <div className="hidden text-xs text-mute sm:block">{user?.location}</div>
          <DataStatusBadge status="SIMULATED" />
          <button type="button" onClick={toggle} aria-label="Toggle theme" className="rounded-full border border-line p-2 dark:border-night-mute/20">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-forest text-xs font-bold text-white">{user?.avatarInitials || 'MM'}</div>
        </header>
        <main className="p-4 pb-24 md:p-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-white py-2 dark:border-night-mute/20 dark:bg-night-card md:hidden">
        {items.slice(0, 5).map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex flex-col items-center text-[10px] ${isActive ? 'text-forest' : 'text-mute'}`}>
            <n.icon size={18} />
            {n.label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
