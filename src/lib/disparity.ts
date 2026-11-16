import type { Facility, RegionStat, SearchFilters } from '../types';

export interface ComputedRegionMetric {
  id: string;
  name: string;
  population10k: number;
  transitAccessScore: number;
  beforeFacilityCount: number;
  beforeSeatCount: number;
  beforeLowCostCount: number;
  beforeEveningCount: number;
  addedFacilityCount: number;
  addedSeatCount: number;
  afterFacilityCount: number;
  afterSeatCount: number;
  afterLowCostCount: number;
  afterEveningCount: number;
  seatsPer10kBefore: number;
  seatsPer10kAfter: number;
  lat: number;
  lng: number;
  summary: string;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterSpaces(
  spaces: Facility[],
  filters: SearchFilters,
  userLocation: { lat: number; lng: number } | null,
): Facility[] {
  const q = filters.query.trim().toLowerCase();
  return spaces.filter((s) => {
    if (!s.isPublished) return false;
    if (
      q &&
      !`${s.name} ${s.regionName} ${s.address} ${s.providerName}`.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (filters.regionId && s.regionId !== filters.regionId) return false;
    if (filters.maxFee !== null && s.feeYen > filters.maxFee) return false;
    if (s.availableSeats < filters.minSeats) return false;
    if (filters.onlyAvailable && s.availableSeats <= 0) return false;
    if (filters.wifi && !s.wifi) return false;
    if (filters.outlets && !s.outlets) return false;
    if (filters.quiet && !s.quiet) return false;
    if (filters.groupOk && !s.groupOk) return false;
    if (filters.barrierFree && !s.barrierFree) return false;
    if (filters.openEvening && s.closeTime < '20:00') return false;
    if (filters.maxDistanceKm !== null && userLocation) {
      const d = haversineKm(userLocation.lat, userLocation.lng, s.lat, s.lng);
      if (d > filters.maxDistanceKm) return false;
    }
    return true;
  });
}

export function computeRegionMetrics(
  regions: RegionStat[],
  simulatedSpaces: Facility[],
): ComputedRegionMetric[] {
  return regions.map((r) => {
    const added = simulatedSpaces.filter((s) => s.regionId === r.id);
    const addedFacilityCount = added.length;
    const addedSeatCount = added.reduce((acc, s) => acc + s.totalSeats, 0);
    const addedLowCost = added.filter((s) => s.feeYen <= 100).length;
    const addedEvening = added.filter((s) => s.closeTime >= '20:00').length;

    const afterFacilityCount = r.baseFacilityCount + addedFacilityCount;
    const afterSeatCount = r.baseSeatCount + addedSeatCount;
    const pop = Math.max(1, r.population10k);

    return {
      id: r.id,
      name: r.name,
      population10k: r.population10k,
      transitAccessScore: r.transitAccessScore,
      beforeFacilityCount: r.baseFacilityCount,
      beforeSeatCount: r.baseSeatCount,
      beforeLowCostCount: r.baseLowCostCount,
      beforeEveningCount: r.baseEveningCount,
      addedFacilityCount,
      addedSeatCount,
      afterFacilityCount,
      afterSeatCount,
      afterLowCostCount: r.baseLowCostCount + addedLowCost,
      afterEveningCount: r.baseEveningCount + addedEvening,
      seatsPer10kBefore: Number((r.baseSeatCount / pop).toFixed(1)),
      seatsPer10kAfter: Number((afterSeatCount / pop).toFixed(1)),
      lat: r.lat,
      lng: r.lng,
      summary: r.summary,
    };
  });
}
