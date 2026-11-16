import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import type { Facility, RegionStat, Reservation, SearchFilters, UserSession } from './types';
import { DEFAULT_FILTERS, INITIAL_DEMO_RESERVATIONS, INITIAL_DEMO_SPACES, INITIAL_REGION_STATS } from './data/demoData';
import {
  fetchFavorites,
  fetchRegions,
  fetchReservations,
  fetchSession,
  fetchSpaces,
} from './lib/api';
import { Navbar, type AppRoute } from './components/Navbar';
import { ErrorRetryCard, FullPageSkeleton } from './components/LiquidUI';
import { SpaceDetailModal } from './components/SpaceDetailModal';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { DisparityPage } from './pages/DisparityPage';
import { SimulationPage } from './pages/SimulationPage';
import { DemoPage } from './pages/DemoPage';
import { MyPage } from './pages/MyPage';
import { AdminPage } from './pages/AdminPage';

function parseRoute(pathname: string): AppRoute {
  if (
    pathname === '/explore' ||
    pathname === '/disparity' ||
    pathname === '/simulation' ||
    pathname === '/demo' ||
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
  const [baseSpaces, setBaseSpaces] = useState<Facility[]>(INITIAL_DEMO_SPACES);
  const [simulatedSpaces, setSimulatedSpaces] = useState<Facility[]>([]);
  const [regions, setRegions] = useState<RegionStat[]>(INITIAL_REGION_STATS);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [selectedSpace, setSelectedSpace] = useState<Facility | null>(null);

  const loadAll = useCallback(async () => {
    setLoadError('');
    try {
      const [sess, spRes, regRes, favs, resv] = await Promise.all([
        fetchSession(),
        fetchSpaces(false),
        fetchRegions(),
        fetchFavorites(),
        fetchReservations(),
      ]);
      setSession(sess);
      setBaseSpaces(spRes.spaces);
      setDataSource(spRes.source);
      setRegions(regRes.regions);
      setFavoriteIds(favs);
      setReservations(resv);
    } catch {
      setLoadError('データの初期化に失敗しました。');
    } finally {
      setTimeout(() => setLoading(false), 320);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const onPopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [loadAll]);

  const navigate = (nextRoute: AppRoute) => {
    if (nextRoute !== route) {
      window.history.pushState({}, '', nextRoute);
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const allSpaces = useMemo(() => [...baseSpaces, ...simulatedSpaces], [baseSpaces, simulatedSpaces]);

  const handleToggleFavorite = async (spaceId: string) => {
    const nextFav = !favoriteIds.includes(spaceId);
    const updated = nextFav
      ? [...favoriteIds, spaceId]
      : favoriteIds.filter((id) => id !== spaceId);
    setFavoriteIds(updated);
    if (!session.authenticated) localStorage.setItem('houkago_favorites', JSON.stringify(updated));

    if (session.authenticated) {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ spaceId, favorite: nextFav }),
      }).catch(() => {});
    }
  };

  const handleCreateReservation = async ({
    space,
    reserveDate,
    startTime,
    endTime,
    seatsCount,
    demoOverride,
  }: {
    space: Facility;
    reserveDate: string;
    startTime: string;
    endTime: string;
    seatsCount: number;
    demoOverride?: boolean;
  }) => {
    if (session.authenticated && !demoOverride && !space.isSimulation) {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ spaceId: space.id, reserveDate, startTime, endTime, seatsCount }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || '予約保存エラー' };
      }
      const created: Reservation = {
        id: json.id || `res-${Date.now()}`,
        spaceId: space.id,
        spaceName: space.name,
        reserveDate,
        startTime,
        endTime,
        seatsCount,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };
      setReservations((prev) => [created, ...prev]);
      await loadAll();
      return { ok: true, reservation: created };
    }

    // デモ / オフライン時のローカル予約シミュレーション
    const created: Reservation = {
      id: `demo-${Date.now().toString().slice(-6)}`,
      spaceId: space.id,
      spaceName: space.name,
      reserveDate,
      startTime,
      endTime,
      seatsCount,
      status: 'confirmed',
      isDemo: true,
      createdAt: new Date().toISOString(),
    };
    const next = [created, ...reservations];
    setReservations(next);
    if (!session.authenticated) localStorage.setItem('houkago_demo_reservations', JSON.stringify(next));
    setBaseSpaces((prev) =>
      prev.map((s) =>
        s.id === space.id
          ? { ...s, availableSeats: Math.max(0, s.availableSeats - seatsCount) }
          : s,
      ),
    );
    return { ok: true, reservation: created };
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
    if (!session.authenticated) localStorage.setItem('houkago_demo_reservations', JSON.stringify(next));
  };

  const handleCheckInReservation = async (id: string) => {
    if (session.authenticated && !id.startsWith('demo-')) {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status: 'checked_in' }),
      });
      if (!response.ok) throw new Error('チェックインを保存できませんでした。再試行してください。');
    }
    const next = reservations.map((r) => (r.id === id ? { ...r, status: 'checked_in' as const } : r));
    setReservations(next);
    if (!session.authenticated) localStorage.setItem('houkago_demo_reservations', JSON.stringify(next));
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
    if (!session.authenticated) localStorage.setItem('houkago_demo_reservations', JSON.stringify(next));
  };

  const handleAddSimulatedSpace = (space: Omit<Facility, 'id' | 'availableSeats'>) => {
    const created: Facility = {
      ...space,
      id: `sim-${Date.now().toString().slice(-6)}`,
      availableSeats: space.totalSeats,
      isSimulation: true,
    };
    setSimulatedSpaces((prev) => [...prev, created]);
  };

  const handleResetAllDemo = () => {
    setSimulatedSpaces([]);
    setFilters(DEFAULT_FILTERS);
    setBaseSpaces(INITIAL_DEMO_SPACES);
    setReservations((current) => session.authenticated ? current.filter((r) => !r.isDemo) : INITIAL_DEMO_RESERVATIONS);
    setFavoriteIds(['sp-sakae-civic']);
    setSelectedSpace(null);
    localStorage.removeItem('houkago_demo_reservations');
    localStorage.removeItem('houkago_favorites');
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
            <AnimatePresence mode="wait">
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
                    regions={regions}
                    filters={filters}
                    onChangeFilters={setFilters}
                    onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                    onSelectSpace={setSelectedSpace}
                  />
                )}
                {route === '/disparity' && (
                  <DisparityPage regions={regions} simulatedSpaces={simulatedSpaces} />
                )}
                {route === '/simulation' && (
                  <SimulationPage
                    regions={regions}
                    baseSpacesCount={baseSpaces.length}
                    baseTotalSeats={baseSpaces.reduce((a, b) => a + b.totalSeats, 0)}
                    simulatedSpaces={simulatedSpaces}
                    onAddSimulatedSpace={handleAddSimulatedSpace}
                    onResetSimulation={() => setSimulatedSpaces([])}
                  />
                )}
                {route === '/demo' && (
                  <DemoPage
                    spaces={allSpaces}
                    regions={regions}
                    simulatedSpaces={simulatedSpaces}
                    favoriteIds={favoriteIds}
                    reservations={reservations}
                    filters={filters}
                    onChangeFilters={setFilters}
                    onResetFilters={() => setFilters(DEFAULT_FILTERS)}
                    onAddSimulatedSpace={handleAddSimulatedSpace}
                    onResetAllDemo={handleResetAllDemo}
                    onSelectSpace={setSelectedSpace}
                    session={session}
                  />
                )}
                {route === '/mypage' && (
                  <MyPage
                    session={session}
                    spaces={allSpaces}
                    reservations={reservations}
                    favoriteIds={favoriteIds}
                    onCancelReservation={handleCancelReservation}
                    onCheckInReservation={handleCheckInReservation}
                    onReschedule={handleReschedule}
                    onSelectSpace={setSelectedSpace}
                    onLogout={async () => {
                      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
                      setSession({ authenticated: false, user: null });
                      localStorage.removeItem('houkago_favorites');
                      localStorage.removeItem('houkago_demo_reservations');
                      setFavoriteIds([]);
                      setReservations([]);
                      await loadAll();
                    }}
                  />
                )}
                {route === '/admin' && (
                  <AdminPage
                    session={session}
                    spaces={allSpaces}
                    regions={regions}
                    onRefreshSpaces={loadAll}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <footer className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 text-center text-[11px] text-slate-500 space-y-1">
          <div>放課後Link｜高校地理授業向けプロトタイプ（掲載施設・企業名・地域統計は仮想データです）</div>
          <div>実運用時には施設管理責任・安全管理・保護者連絡・プライバシー保護体制の検討が必要です。</div>
        </footer>

        <SpaceDetailModal
          space={selectedSpace}
          onClose={() => setSelectedSpace(null)}
          isFavorite={selectedSpace ? favoriteIds.includes(selectedSpace.id) : false}
          onToggleFavorite={handleToggleFavorite}
          session={session}
          onCreateReservation={handleCreateReservation}
          allowDemoBooking={route === '/demo' || dataSource === 'demo-fallback'}
        />
      </div>
    </MotionConfig>
  );
}

export default App;
