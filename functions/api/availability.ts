import type { Env } from '../_lib/types';
import { getSession, jsonResponse } from '../_lib/auth';
import { validReservation } from '../_lib/reservation';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);
  if (!await getSession(request, env)) return jsonResponse({ error: 'ログインが必要です' }, 401);
  const params = new URL(request.url).searchParams;
  const space = params.get('spaceId') || '';
  const date = params.get('reserveDate') || '';
  const start = params.get('startTime') || '';
  const end = params.get('endTime') || '';
  if (!space || !validReservation(date, start, end, 1)) return jsonResponse({ error: '予約日時を確認してください' }, 400);

  // Peak occupancy only changes at the requested start or an existing reservation start.
  const row = await env.DB.prepare(`WITH input(space_id, reserve_date, start_time, end_time) AS (VALUES (?, ?, ?, ?)),
    points(point) AS (
      SELECT start_time FROM input
      UNION SELECT r.start_time FROM reservations r, input i
      WHERE r.space_id = i.space_id AND r.reserve_date = i.reserve_date AND r.status IN ('confirmed', 'checked_in')
        AND r.start_time > i.start_time AND r.start_time < i.end_time
    )
    SELECT s.total_seats - COALESCE((SELECT MAX((SELECT COALESCE(SUM(r.seats_count), 0)
      FROM reservations r, input i WHERE r.space_id = i.space_id AND r.reserve_date = i.reserve_date
        AND r.status IN ('confirmed', 'checked_in') AND r.start_time <= p.point AND r.end_time > p.point))
      FROM points p), 0) AS available
    FROM spaces s, input i WHERE s.id = i.space_id AND s.is_published = 1 AND s.is_demo = 0
      AND s.open_time <= i.start_time AND s.close_time >= i.end_time`)
    .bind(space, date, start, end).first<{ available: number }>();
  if (!row) return jsonResponse({ error: '施設または営業時間を確認してください' }, 404);
  return jsonResponse({ availableSeats: Math.max(0, Number(row.available)) });
};
