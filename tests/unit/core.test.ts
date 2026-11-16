import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, INITIAL_DEMO_SPACES, INITIAL_REGION_STATS } from '../../src/data/demoData';
import { computeRegionMetrics, filterSpaces } from '../../src/lib/disparity';
import { offlineNaturalSearch } from '../../src/lib/api';

describe('施設検索フィルター', () => {
  it('無料かつWi-Fiありで絞り込める', () => {
    const res = filterSpaces(
      INITIAL_DEMO_SPACES,
      { ...DEFAULT_FILTERS, maxFee: 0, wifi: true },
      null,
    );
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((s) => s.feeYen === 0 && s.wifi)).toBe(true);
  });

  it('グループ学習可で絞り込める', () => {
    const res = filterSpaces(INITIAL_DEMO_SPACES, { ...DEFAULT_FILTERS, groupOk: true }, null);
    expect(res.every((s) => s.groupOk)).toBe(true);
  });
});

describe('地域格差計算とシミュレーション反映', () => {
  it('知多半島に28席追加すると施設数と座席数が正確に増える', () => {
    const simSpace = { ...INITIAL_DEMO_SPACES[0], id: 'sim-1', regionId: 'chita', totalSeats: 28 };
    const metrics = computeRegionMetrics(INITIAL_REGION_STATS, [simSpace]);
    const chita = metrics.find((m) => m.id === 'chita')!;
    expect(chita.afterFacilityCount).toBe(chita.beforeFacilityCount + 1);
    expect(chita.afterSeatCount).toBe(chita.beforeSeatCount + 28);
  });
});

describe('AIオフライン代替パーサー', () => {
  it('自然言語から無料・静か・Wi-Fi条件を抽出できる', () => {
    const parsed = offlineNaturalSearch('無料で静かなWi-Fiがある場所');
    expect(parsed.mode).toBe('offline-demo');
    expect(parsed.criteria.maxFee).toBe(0);
    expect(parsed.criteria.quiet).toBe(true);
    expect(parsed.criteria.wifi).toBe(true);
  });
});
