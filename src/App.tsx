import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import type { Facility, Reservation, SearchFilters, UserSession } from './types';
import { DEFAULT_FILTERS } from './data/demoData';
import {
  fetchFavorites,
  fetchReservations,
  fetchSession,
  fetchSpaces,
} from './lib/api';
import { Navbar, type AppRoute } from './components/Navbar';
import { ErrorRetryCard, FullPageSkeleton } from './components/LiquidUI';
import { SpaceDetailModal } from './components/SpaceDetailModal';
import { HomePage } from './pages/HomePage';
const ExplorePage = lazy(() => import('./pages/ExplorePage').then((module) => ({ default: module.ExplorePage })));
const MyPage = lazy(() => import('./pages/MyPage').then((module) => ({ default: module.MyPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));

function parseRoute(pathname: string): AppRoute {
  if (
    pathname === '/explore' ||
    pathname === '/mypage' ||
    pathname === '/admin'
  ) {
    return pathname;
  }
  return '/';
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dataSource, setDataSource] = useState<'d1' | 'demo-fallback'>('demo-fallback');
  const [session, setSession] = useState<UserSession>({ authenticated: false, user: null });
  const [baseSpaces, setBaseSpaces] = useState<Facility[]>([]);
  const loadedSpaces = useRef<Facility[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [selectedSpace, setSelectedSpace] = useState<Facility | null>(null);

  const loadAll = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const sessionRequest = fetchSession();
      const [sess, spRes, favs, resv] = await Promise.all([
        sessionRequest,
        fetchSpaces(false),
        sessionRequest.then((current) => fetchFavorites(current.authenticated)),
        sessionRequest.then((current) => fetchReservations(current.authenticated)),
      ]);
      setSession(sess);
      setBaseSpaces(spRes.spaces);
      loadedSpaces.current = spRes.spaces;
      setDataSource(spRes.source);
      setFavoriteIds(favs);
      setReservations(resv);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'データの初期化に失敗しました。');
    } finally {
      setTimeout(() => setLoading(false), 320);
    }
  }, []);

  const refreshSpaces = useCallback(async () => {
    const result = await fetchSpaces(false);
    setBaseSpaces(result.spaces);
    setDataSource(result.source);
  }, []);

  useEffect(() => {
    loadAll();
    const onPopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loadAll]);

  useEffect(() => {
    let active = true;
    const recheckSession = async () => {
      if (document.visibilityState !== 'visible') return;
      // Hide account-specific data until a tab returning to view checks the shared cookie.
      setLoading(true);
      const current = await fetchSession();
      if (!active) return;
      if (current.authenticated !== session.authenticated || current.user?.sub !== session.user?.sub) {
        setReservations([]);
        setFavoriteIds([]);
        setSelectedSpace(null);
        await loadAll();
      } else {
        setLoading(false);
      }
    };
    document.addEventListener('visibilitychange', recheckSession);
    return () => { active = false; document.removeEventListener('visibilitychange', recheckSession); };
  }, [loadAll, session.authenticated, session.user?.sub]);

  const navigate = (nextRoute: AppRoute) => {
    if (nextRoute !== route) {
      window.history.pushState({}, '', nextRoute);
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const allSpaces = dataSource === 'd1'
    ? baseSpaces.filter((space) => !space.isSimulation && !space.isDemo)
    : [];

  const handleToggleFavorite = async (spaceId: string) => {
    const nextFav = !favoriteIds.includes(spaceId);
    if (session.authenticated) {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ spaceId, favorite: nextFav }),
      });
      if (!response.ok) throw new Error('お気に入りを保存できませんでした。再試行してください。');
    }
    const updated = nextFav
      ? [...favoriteIds, spaceId]
      : favoriteIds.filter((id) => id !== spaceId);
    setFavoriteIds(updated);
    if (!session.authenticated) localStorage.setItem('houkago_favorites', JSON.stringify(updated));
  };

  const handleCreateReservation = async ({
    space, reserveDate, startTime, endTime, seatsCount,
  }: {
    space: Facility; reserveDate: string; startTime: string; endTime: string; seatsCount: number;
  }) => {
    if (!session.authenticated) return { ok: false, error: '予約するにはGoogleログインが必要です。' };
    if (space.isSimulation) return { ok: false, error: 'この施設はオンライン予約に対応していません。' };
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ spaceId: space.id, reserveDate, startTime, endTime, seatsCount }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !json.ok) return { ok: false, error: json.error || '予約保存エラー' };
      const created: Reservation = {
        id: json.id || `res-${Date.now()}`, spaceId: space.id, spaceName: space.name,
        reserveDate, startTime, endTime, seatsCount, status: 'confirmed', createdAt: new Date().toISOString(),
      };
      setReservations((current) => [created, ...current]);
      return { ok: true, reservation: created };
    } catch {
      return { ok: false, error: '予約を保存できませんでした。通信状態を確認してください。' };
    }
  };
  const handleCancelReservation = async (id: string) => {
    if (session.authenticated && !id.startsWith('demo-')) {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!response.ok) throw new Error('予約を取り消せませんでした。再試行してください。');
    }
    const next = reservations.map((r) => (r.id === id ? { ...r, status: 'cancelled' as const } : r));
    setReservations(next);
  };

  const handleReschedule = async (id: string, changes: { reserveDate: string; startTime: string; endTime: string; seatsCount: number }) => {
    if (session.authenticated && !id.startsWith('demo-')) {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ action: 'reschedule', ...changes }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || '予約を変更できませんでした。');
    }
    const next = reservations.map((reservation) => reservation.id === id ? { ...reservation, ...changes } : reservation);
    setReservations(next);
  };

  if (loading) {
    return <FullPageSkeleton />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen pb-24 lg:pb-12">
        <Navbar
          currentRoute={route}
          onNavigate={navigate}
          session={session}
          dataSource={dataSource}
        />

        <main className="mx-auto max-w-7xl px-3 sm:px-6 pt-5">
          {loadError ? (
            <ErrorRetryCard message={loadError} onRetry={loadAll} />
          ) : (
            <Suspense fallback={<FullPageSkeleton />}><AnimatePresence mode="wait">
              <motion.div
                key={route}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {route === '/' && (
                  <HomePage
                    spaces={allSpaces}
                    favoriteIds={favoriteIds}
                    reservations={reservations}
                    onQuickSearch={(q) => {
                      setFilters({ ...DEFAULT_FILTERS, query: q });
                      navigate('/explore');
                    }}
                    onNavigate={navigate}
                    onSelectSpace={setSelectedSpace}
                  />
                )}
                {route === '/explore' && (
                  <ExplorePage
                    spaces={allSpaces}
                    filters={filters}
                    onChangeFilters={setFilters}
                    onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                    onSelectSpace={setSelectedSpace}
                  />
                )}
                {route === '/mypage' && (
                  <MyPage
                    session={session}
                    spaces={allSpaces}
                    reservations={reservations}
                    favoriteIds={favoriteIds}
                    onCancelReservation={handleCancelReservation}
                    onReschedule={handleReschedule}
                    onSelectSpace={setSelectedSpace}
                    onDeleteAccount={async () => {
                      const response = await fetch('/api/account', { method: 'DELETE', credentials: 'same-origin' });
                      if (!response.ok) throw new Error('削除に失敗しました');
                      setSession({ authenticated: false, user: null });
                      setReservations([]);
                      setFavoriteIds([]);
                      setSelectedSpace(null);
                    }}
                    onLogout={async () => {
                      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
                      setSession({ authenticated: false, user: null });
                      setFavoriteIds([]);
                      setReservations([]);
                      await loadAll();
                    }}
                  />
                )}
                {route === '/admin' && (
                  <AdminPage
                    session={session}
                    regions={[]}
                    spaces={allSpaces}
                    onRefreshSpaces={refreshSpaces}
                  />
                )}
              </motion.div>
            </AnimatePresence></Suspense>
          )}
        </main>

        <footer className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 text-center text-[11px] text-slate-500 space-y-1">
          <div>放課後Link｜学習場所の検索・予約</div>
          <div>施設情報や予約枠は運営者の確認後に掲載しています。利用前に各施設の案内をご確認ください。</div>
          <div><a href="/privacy.html" className="text-blue-700 underline">データの取扱い</a></div>
        </footer>

        <SpaceDetailModal
          space={selectedSpace}
          onClose={() => setSelectedSpace(null)}
          isFavorite={selectedSpace ? favoriteIds.includes(selectedSpace.id) : false}
          onToggleFavorite={handleToggleFavorite}
          session={session}
          onCreateReservation={handleCreateReservation}
        />
      </div>
    </MotionConfig>
  );
}

export default App;
