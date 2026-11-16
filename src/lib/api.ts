import {
  INITIAL_DEMO_RESERVATIONS,
  INITIAL_DEMO_SPACES,
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
    if (!Array.isArray(data.spaces) || data.spaces.length === 0) throw new Error('Empty');
    return { spaces: data.spaces, source: 'd1' };
  } catch {
    return { spaces: INITIAL_DEMO_SPACES, source: 'demo-fallback' };
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
    if (!Array.isArray(data.regions) || data.regions.length === 0) throw new Error('Empty');
    return { regions: data.regions, source: 'd1' };
  } catch {
    return { regions: INITIAL_REGION_STATS, source: 'demo-fallback' };
  }
}

export async function fetchFavorites(): Promise<string[]> {
  try {
    const res = await fetch('/api/favorites', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('fallback');
    const data = (await res.json()) as { favoriteIds: string[] };
    return data.favoriteIds || [];
  } catch {
    const raw = localStorage.getItem('houkago_favorites');
    return raw ? (JSON.parse(raw) as string[]) : ['sp-sakae-civic'];
  }
}

export async function fetchReservations(): Promise<Reservation[]> {
  try {
    const res = await fetch('/api/reservations', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('fallback');
    const data = (await res.json()) as { reservations: Reservation[] };
    return data.reservations || [];
  } catch {
    const raw = localStorage.getItem('houkago_demo_reservations');
    if (!raw) return INITIAL_DEMO_RESERVATIONS;
    try {
      const stored: unknown = JSON.parse(raw);
      // Older versions could store authenticated reservations here. Never show those to a guest.
      return Array.isArray(stored) ? stored.filter((item): item is Reservation => Boolean(item && typeof item.id === 'string' && item.id.startsWith('demo-'))) : [];
    } catch {
      return [];
    }
  }
}

export function offlineNaturalSearch(query: string): AiRecommendationResult {
  const q = query.toLowerCase();
  return {
    mode: 'offline-demo',
    model: null,
    criteria: {
      maxFee: q.includes('無料') || q.includes('0円') ? 0 : q.includes('100円') ? 100 : null,
      wifi: q.includes('wi-fi') || q.includes('wifi'),
      outlets: q.includes('コンセント') || q.includes('電源'),
      quiet: q.includes('静か') || q.includes('集中'),
      groupOk: q.includes('友達') || q.includes('グループ') || q.includes('人'),
      openEvening: q.includes('夕方') || q.includes('夜') || q.includes('遅く'),
      regionHint:
        ['名古屋', '栄', '名駅', '天白', '一宮', '春日井', '岡崎', '豊橋', '半田'].find((k) =>
          q.includes(k),
        ) || '',
    },
    summary: '【オフライン代替デモ（AI未実行）】ローカル条件抽出で候補を絞り込みました。',
  };
}

export async function requestAiRecommend(query: string): Promise<AiRecommendationResult> {
  try {
    const res = await fetch('/api/ai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error('AI API unavailable');
    return (await res.json()) as AiRecommendationResult;
  } catch {
    return offlineNaturalSearch(query);
  }
}
