import { useState, useRef, useEffect } from 'react';
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
  Globe,
  Check,
} from 'lucide-react';
import { Logo } from '../components/Logo.jsx';
import { DataStatusBadge } from '../components/DataStatusBadge.jsx';
import { GlobalSearch } from '../components/GlobalSearch.jsx';
import { MandiMindAssistantModal } from '../components/MandiMindAssistantModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useTranslation } from '../i18n/index.jsx';

const NAV = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['seller', 'admin'] },
  { key: 'marketplace', to: '/marketplace', label: 'Marketplace', icon: Store, roles: ['seller', 'farmer', 'admin', 'buyer'] },
  { key: 'matches', to: '/matches', label: 'AI Matches', icon: Zap, roles: ['seller', 'farmer', 'admin', 'buyer'] },
  { key: 'intelligence', to: '/intelligence', label: 'Market Intelligence', icon: LineChart, roles: ['seller', 'admin'] },
  { key: 'inventory', to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['seller', 'admin'] },
  { key: 'recommendations', to: '/recommendations', label: 'Recommendations', icon: Sparkles, roles: ['seller', 'admin'] },
  { key: 'logistics', to: '/logistics', label: 'Logistics', icon: Truck, roles: ['seller', 'farmer', 'admin', 'buyer'] },
  { key: 'map', to: '/map', label: 'Market Map', icon: Map, roles: ['seller', 'farmer', 'admin', 'buyer'] },
  { key: 'forecasts', to: '/forecasts', label: 'Forecasts', icon: Activity, roles: ['seller', 'admin'] },
  { key: 'transactions', to: '/transactions', label: 'Transactions', icon: Receipt, roles: ['seller', 'farmer', 'admin', 'buyer'] },
  { key: 'farmer', to: '/farmer', label: 'Farmer Mode', icon: Tractor, roles: ['farmer', 'admin', 'seller'] },
  { key: 'simulator', to: '/simulator', label: 'What-If Simulator', icon: SlidersHorizontal, roles: ['seller', 'admin'] },
  { key: 'alerts', to: '/alerts', label: 'Alerts', icon: Bell, roles: ['seller', 'farmer', 'admin'] },
  { key: 'models', to: '/models', label: 'Model Performance', icon: Activity, roles: ['admin', 'seller'] },
  { key: 'settings', to: '/settings', label: 'Settings', icon: Settings, roles: ['seller', 'farmer', 'admin', 'buyer'] },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { t, lang, setLanguage, languages, currentLangObj } = useTranslation();
  const navigate = useNavigate();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const langMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
              {t(`nav.${n.key}`, n.label)}
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
            <LogOut size={14} /> {t('auth.logout', 'Logout')}
          </button>
        </div>
      </aside>

      <div className="md:pl-[260px]">
        <header className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur dark:border-night-mute/20 dark:bg-night-card/90">
          <div className="md:hidden">
            <Logo compact />
          </div>
          <GlobalSearch />
          <div className="hidden text-xs text-mute sm:block">{user?.location}</div>

          {/* Language Selector Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-xs font-bold hover:bg-earth dark:border-night-mute/20 dark:hover:bg-night-lift transition-colors"
              title="Change Language"
            >
              <Globe size={14} className="text-forest dark:text-harvest" />
              <span className="hidden sm:inline font-medium">{currentLangObj.native}</span>
              <span className="sm:hidden font-mono uppercase text-[10px]">{lang}</span>
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 max-h-80 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-xl dark:border-night-mute/20 dark:bg-night-card z-50">
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase text-mute border-b border-line/60 dark:border-night-mute/30 mb-1">
                  {t('settings.languagePref', 'Language')}
                </div>
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${lang === l.code
                        ? 'bg-forest/10 text-forest font-bold dark:bg-harvest/15 dark:text-harvest'
                        : 'text-ink hover:bg-earth dark:text-night-text dark:hover:bg-night-lift'
                      }`}
                  >
                    <div className="text-left">
                      <div className="font-medium">{l.native}</div>
                      <div className="text-[10px] text-mute">{l.name}</div>
                    </div>
                    {lang === l.code && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/10 px-3 py-1.5 text-xs font-bold text-forest hover:bg-forest hover:text-white dark:border-harvest/30 dark:bg-harvest/15 dark:text-harvest dark:hover:bg-harvest dark:hover:text-ink transition-colors"
            title="MandiMind AI Assistant"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

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

      <MandiMindAssistantModal
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-white py-2 dark:border-night-mute/20 dark:bg-night-card md:hidden">
        {items.slice(0, 5).map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex flex-col items-center text-[10px] ${isActive ? 'text-forest' : 'text-mute'}`}>
            <n.icon size={18} />
            {t(`nav.${n.key}`, n.label).split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
