import type { Env } from '../_lib/types';
import { assertSameOrigin, getSession, jsonResponse } from '../_lib/auth';

interface SpaceRow {
  id: string;
  name: string;
  provider_type: 'enterprise' | 'municipality' | 'community';
  provider_name: string;
  region_id: string;
  region_name: string;
  address: string;
  lat: number;
  lng: number;
  fee_yen: number;
  open_time: string;
  close_time: string;
  total_seats: number;
  booked_seats: number | null;
  wifi: number;
  outlets: number;
  quiet: number;
  solo_ok: number;
  group_ok: number;
  barrier_free: number;
  rules_json: string;
  notes: string;
  is_published: number;
  is_demo: number;
  theme_hue: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return jsonResponse({ error: 'DB未接続', fallback: true }, 503);

  const url = new URL(request.url);
  const includeUnpublished = url.searchParams.get('includeUnpublished') === '1';
  const session = includeUnpublished ? await getSession(request, env) : null;
  const allowAll = includeUnpublished && session?.role === 'admin';
  const today = new Date().toISOString().slice(0, 10);

  const sql = `
    SELECT s.*,
      COALESCE((
        SELECT SUM(r.seats_count) FROM reservations r
        WHERE r.space_id = s.id AND r.reserve_date = ? AND r.status = 'confirmed'
      ), 0) AS booked_seats
    FROM spaces s
    ${allowAll ? '' : 'WHERE s.is_published = 1'}
    ORDER BY s.created_at ASC
  `;
  const { results } = await env.DB.prepare(sql).bind(today).all<SpaceRow>();

  const spaces = (results || []).map((row) => ({
    id: row.id,
    name: row.name,
    providerType: row.provider_type,
    providerName: row.provider_name,
    regionId: row.region_id,
    regionName: row.region_name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    feeYen: row.fee_yen,
    openTime: row.open_time,
    closeTime: row.close_time,
    totalSeats: row.total_seats,
    availableSeats: Math.max(0, row.total_seats - Number(row.booked_seats || 0)),
    wifi: Boolean(row.wifi),
    outlets: Boolean(row.outlets),
    quiet: Boolean(row.quiet),
    soloOk: Boolean(row.solo_ok),
    groupOk: Boolean(row.group_ok),
    barrierFree: Boolean(row.barrier_free),
    rules: JSON.parse(row.rules_json || '[]') as string[],
    notes: row.notes,
    isPublished: Boolean(row.is_published),
    isDemo: Boolean(row.is_demo),
    themeHue: row.theme_hue,
  }));

  return jsonResponse({ spaces });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!assertSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);

  const session = await getSession(request, env);
  if (!session || session.role !== 'admin') {
    return jsonResponse({ error: '管理者権限が必要です' }, 403);
  }

  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name || '').trim().slice(0, 80);
  const providerName = String(body.providerName || '').trim().slice(0, 80);
  const address = String(body.address || '').trim().slice(0, 120);
  const totalSeats = Number(body.totalSeats || 10);
  const feeYen = Math.max(0, Math.min(2000, Number(body.feeYen || 0)));

  if (!name || !providerName || !address || totalSeats < 1 || totalSeats > 500) {
    return jsonResponse({ error: '入力内容を確認してください' }, 400);
  }

  const id = `sp-${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare(
    `INSERT INTO spaces (
      id, name, provider_type, provider_name, region_id, region_name, address,
      lat, lng, fee_yen, open_time, close_time, total_seats,
      wifi, outlets, quiet, solo_ok, group_ok, barrier_free, rules_json, notes, is_published, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      name,
      ['enterprise', 'municipality', 'community'].includes(String(body.providerType))
        ? String(body.providerType)
        : 'enterprise',
      providerName,
      String(body.regionId || 'nagoya-center'),
      String(body.regionName || '名古屋市中心部'),
      address,
      Number(body.lat || 35.1709),
      Number(body.lng || 136.8815),
      feeYen,
      String(body.openTime || '15:30'),
      String(body.closeTime || '20:30'),
      totalSeats,
      body.wifi ? 1 : 0,
      body.outlets ? 1 : 0,
      body.quiet ? 1 : 0,
      body.soloOk !== false ? 1 : 0,
      body.groupOk ? 1 : 0,
      body.barrierFree ? 1 : 0,
      JSON.stringify(Array.isArray(body.rules) ? body.rules.slice(0, 6) : ['プロトタイプ表示用施設']),
      String(body.notes || '').slice(0, 200),
      body.isPublished !== false ? 1 : 0,
      1,
    )
    .run();

  return jsonResponse({ ok: true, id }, 201);
};
