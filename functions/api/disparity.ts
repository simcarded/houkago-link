import type { Env } from '../_lib/types';
import { jsonResponse } from '../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) return jsonResponse({ error: 'DB未接続', fallback: true }, 503);
  const { results } = await env.DB.prepare('SELECT * FROM region_stats_demo ORDER BY id').all<
    Record<string, unknown>
  >();
  return jsonResponse({
    regions: (results || []).map((r) => ({
      id: r.id,
      name: r.name,
      population10k: r.population_10k,
      transitAccessScore: r.transit_access_score,
      baseFacilityCount: r.base_facility_count,
      baseSeatCount: r.base_seat_count,
      baseLowCostCount: r.base_low_cost_count,
      baseEveningCount: r.base_evening_count,
      lat: r.lat,
      lng: r.lng,
      summary: r.summary,
      isDemoVirtualData: true,
    })),
  });
};
