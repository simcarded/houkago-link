import { motion } from 'motion/react';
import {
  BarChart3,
  Building2,
  Compass,
  Home,
  Presentation,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { UserSession } from '../types';

export type AppRoute =
  | '/'
  | '/explore'
  | '/disparity'
  | '/simulation'
  | '/demo'
  | '/mypage'
  | '/admin';

interface NavbarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  session: UserSession;
  dataSource: 'd1' | 'demo-fallback';
}

const NAV_ITEMS: Array<{ route: AppRoute; label: string; icon: typeof Home }> = [
  { route: '/', label: 'ホーム', icon: Home },
  { route: '/explore', label: '探す・地図', icon: Compass },
  { route: '/disparity', label: '地域格差', icon: BarChart3 },
  { route: '/simulation', label: '施設提供', icon: Building2 },
  { route: '/demo', label: '発表モード', icon: Presentation },
];

export function Navbar({ currentRoute, onNavigate, session, dataSource }: NavbarProps) {
  return (
    <>
      <header className="sticky top-3 z-40 mx-auto max-w-7xl px-3 sm:px-6">
        <div className="liquid-glass rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-sm">
              放L
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold tracking-tight text-slate-900">
                放課後Link
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                <span>プロトタイプ</span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{dataSource === 'd1' ? 'データ接続中' : 'データ取得不可・デモ表示'}</span>
              </div>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1" aria-label="メインナビゲーション">
            {NAV_ITEMS.map(({ route, label, icon: Icon }) => {
              const active = currentRoute === route;
              return (
                <button
                  key={route}
                  type="button"
                  onClick={() => onNavigate(route)}
                  className={`relative px-3.5 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
                    active ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-blue-50/90 border border-blue-200/70 -z-10"
                    />
                  )}
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {session.user?.isAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className={`hidden sm:inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
                  currentRoute === '/admin'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white/80 text-slate-700 border border-slate-200 hover:bg-white'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                管理
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('/mypage')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium transition ${
                currentRoute === '/mypage'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/85 text-slate-800 border border-slate-200/80 hover:bg-white'
              }`}
            >
              <User className="h-4 w-4" />
              <span>{session.authenticated ? session.user?.displayName : 'マイページ'}</span>
            </button>
          </div>
        </div>
      </header>

      <nav
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40 liquid-glass rounded-2xl px-2 py-1.5 flex items-center justify-around"
        aria-label="モバイルナビゲーション"
      >
        {NAV_ITEMS.map(({ route, label, icon: Icon }) => {
          const active = currentRoute === route;
          return (
            <button
              key={route}
              type="button"
              onClick={() => onNavigate(route)}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition ${
                active ? 'text-blue-700 bg-blue-50/90' : 'text-slate-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
