import type { Env } from '../../_lib/types';
import { assertSameOrigin, getSession, jsonResponse } from '../../_lib/auth';
import { validReservation } from '../../_lib/reservation';

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!assertSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);

  const session = await getSession(request, env);
  if (!session) return jsonResponse({ error: '認証が必要です' }, 401);

  const id = String(params.id || '');
  const body = (await request.json()) as Record<string, unknown>;
  const status = String(body.status || '');

  if (body.action === 'reschedule') {
    const reserveDate = String(body.reserveDate || '');
    const startTime = String(body.startTime || '');
    const endTime = String(body.endTime || '');
    const seatsCount = Number(body.seatsCount);
    if (!validReservation(reserveDate, startTime, endTime, seatsCount)) {
      return jsonResponse({ error: '予約日時の入力値が不正です' }, 400);
    }
    // A single update keeps the old reservation intact when the new slot is unavailable.
    const result = await env.DB.prepare(`UPDATE reservations AS r
      SET reserve_date = ?, start_time = ?, end_time = ?, seats_count = ?
      WHERE r.id = ? AND r.user_sub = ? AND r.status = 'confirmed'
        AND EXISTS (SELECT 1 FROM spaces s WHERE s.id = r.space_id AND s.is_published = 1 AND s.open_time <= ? AND s.close_time >= ?)
        AND NOT EXISTS (SELECT 1 FROM reservations other WHERE other.id != r.id AND other.user_sub = r.user_sub
          AND other.reserve_date = ? AND other.status IN ('confirmed', 'checked_in')
          AND NOT (other.end_time <= ? OR other.start_time >= ?))
        AND NOT EXISTS (SELECT 1 FROM (
          SELECT ? AS point
          UNION SELECT other.start_time FROM reservations other WHERE other.id != r.id AND other.space_id = r.space_id
            AND other.reserve_date = ? AND other.status IN ('confirmed', 'checked_in')
            AND other.start_time > ? AND other.start_time < ?
        ) points WHERE COALESCE((SELECT SUM(other.seats_count) FROM reservations other
          WHERE other.id != r.id AND other.space_id = r.space_id AND other.reserve_date = ?
            AND other.status IN ('confirmed', 'checked_in') AND other.start_time <= points.point
            AND other.end_time > points.point), 0) + ? > (SELECT s.total_seats FROM spaces s WHERE s.id = r.space_id))`)
      .bind(reserveDate, startTime, endTime, seatsCount, id, session.sub, startTime, endTime,
        reserveDate, startTime, endTime, startTime, reserveDate, startTime, endTime, reserveDate, seatsCount).run();
    if (result.meta.changes !== 1) return jsonResponse({ error: '変更できませんでした。予約状況と営業時間をご確認ください。' }, 409);
    return jsonResponse({ ok: true });
  }

  if (status === 'cancelled' || status === 'checked_in') {
    const query =
      session.role === 'admin'
        ? `UPDATE reservations SET status = ? WHERE id = ? AND status = 'confirmed'`
        : `UPDATE reservations SET status = ? WHERE id = ? AND user_sub = ? AND status = 'confirmed'`;
    const stmt =
      session.role === 'admin'
        ? env.DB.prepare(query).bind(status, id)
        : env.DB.prepare(query).bind(status, id, session.sub);
    const res = await stmt.run();
    if (res.meta.changes === 0) return jsonResponse({ error: '対象予約が見つかりません' }, 404);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: '更新内容が不正です' }, 400);
};
