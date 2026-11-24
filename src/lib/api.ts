import {
  INITIAL_DEMO_RESERVATIONS,
  INITIAL_REGION_STATS,
} from '../data/demoData';
import type {
  AiRecommendationResult,
  Facility,
  RegionStat,
  Reservation,
  UserSession,
} from '../types';

export async function fetchSession(): Promise<UserSession> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) return { authenticated: false, user: null };
    return (await res.json()) as UserSession;
  } catch {
    return { authenticated: false, user: null };
  }
}

export async function fetchSpaces(includeUnpublished = false): Promise<{
  spaces: Facility[];
  source: 'd1' | 'demo-fallback';
}> {
  try {
    const url = includeUnpublished ? '/api/spaces?includeUnpublished=1' : '/api/spaces';
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('API unavailable');
    const data = (await res.json()) as { spaces: Facility[] };
    if (!Array.isArray(data.spaces)) throw new Error('Invalid spaces response');
    return { spaces: data.spaces, source: 'd1' };
  } catch {
    return { spaces: [], source: 'demo-fallback' };
  }
}

export async function fetchRegions(): Promise<{
  regions: RegionStat[];
  source: 'd1' | 'demo-fallback';
}> {
  try {
    const res = await fetch('/api/disparity');
    if (!res.ok) throw new Error('API unavailable');
    const data = (await res.json()) as { regions: RegionStat[] };
    if (!Array.isArray(data.regions)) throw new Error('Invalid regions response');
    return { regions: data.regions, source: 'd1' };
  } catch {
    return { regions: INITIAL_REGION_STATS, source: 'demo-fallback' };
  }
}

function localFavorites(): string[] {
  try {
    const raw = localStorage.getItem('houkago_favorites');
    if (!raw) return ['sp-sakae-civic'];
    const stored: unknown = JSON.parse(raw);
    return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string') : [];
  } catch { return []; }
}

export async function fetchFavorites(authenticated = true): Promise<string[]> {
  if (!authenticated) return localFavorites();
  try {
    const res = await fetch('/api/favorites', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('favorites unavailable');
    const data = (await res.json()) as { favoriteIds: string[] };
    if (!Array.isArray(data.favoriteIds)) throw new Error('invalid favorites');
    return data.favoriteIds;
  } catch {
    throw new Error('お気に入りを読み込めませんでした。通信状態を確認して再試行してください。');
  }
}

function localReservations(): Reservation[] {
  try {
    const raw = localStorage.getItem('houkago_demo_reservations');
    if (!raw) return INITIAL_DEMO_RESERVATIONS;
    const stored: unknown = JSON.parse(raw);
    // Older versions could store authenticated reservations here. Never show those to a guest.
    return Array.isArray(stored) ? stored.filter((item): item is Reservation => Boolean(item && typeof item.id === 'string' && item.id.startsWith('demo-'))) : [];
  } catch { return []; }
}

export async function fetchReservations(authenticated = true): Promise<Reservation[]> {
  if (!authenticated) return localReservations();
  try {
    const res = await fetch('/api/reservations', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('reservations unavailable');
    const data = (await res.json()) as { reservations: Reservation[] };
    if (!Array.isArray(data.reservations)) throw new Error('invalid reservations');
    return data.reservations;
  } catch {
    throw new Error('予約を読み込めませんでした。通信状態を確認して再試行してください。');
  }
}

export function offlineNaturalSearch(query: string): AiRecommendationResult {
  const q = query.normalize('NFKC').toLowerCase();
  return {
    mode: 'offline-demo',
    model: null,
    criteria: {
      maxFee: q.includes('無料') || q.includes('0円') || q.includes('ただ') ? 0 : q.includes('100円') ? 100 : null,
      wifi: q.includes('wi-fi') || q.includes('wifi') || q.includes('ネット'),
      outlets: q.includes('コンセント') || q.includes('電源') || q.includes('充電'),
      quiet: q.includes('静か') || q.includes('集中'),
      groupOk: q.includes('友達') || q.includes('グループ') || /[2-9]人/.test(q) || q.includes('相談'),
      openEvening: q.includes('夕方') || q.includes('夜') || q.includes('遅く') || q.includes('20時'),
      regionHint:
        ['名古屋', '栄', '名駅', '天白', '一宮', '春日井', '岡崎', '豊橋', '半田', '三河', '知多', '尾張'].find((k) =>
          q.includes(k),
        ) || '',
    },
    summary: '入力されたキーワードを端末内で読み取り、条件に合う施設を表示します。',
  };
}

export async function requestAiRecommend(query: string): Promise<AiRecommendationResult> {
  return offlineNaturalSearch(query);
}
