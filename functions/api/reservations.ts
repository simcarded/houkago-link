import type { Env } from '../_lib/types';
import { assertSameOrigin, getSession, jsonResponse } from '../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);
  const session = await getSession(request, env);
  if (!session) return jsonResponse({ error: 'ログインが必要です' }, 401);

  const url = new URL(request.url);
  const allForAdmin = url.searchParams.get('scope') === 'admin' && session.role === 'admin';

  const sql = allForAdmin
    ? `SELECT r.*, s.name AS space_name FROM reservations r JOIN spaces s ON s.id = r.space_id ORDER BY r.reserve_date DESC, r.start_time DESC LIMIT 100`
    : `SELECT r.*, s.name AS space_name FROM reservations r JOIN spaces s ON s.id = r.space_id WHERE r.user_sub = ? ORDER BY r.reserve_date DESC, r.start_time DESC LIMIT 50`;

  const stmt = allForAdmin ? env.DB.prepare(sql) : env.DB.prepare(sql).bind(session.sub);
  const { results } = await stmt.all<Record<string, unknown>>();

  return jsonResponse({
    reservations: (results || []).map((r) => ({
      id: r.id,
      spaceId: r.space_id,
      spaceName: r.space_name,
      reserveDate: r.reserve_date,
      startTime: r.start_time,
      endTime: r.end_time,
      seatsCount: r.seats_count,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!assertSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);

  const session = await getSession(request, env);
  if (!session) return jsonResponse({ error: '予約保存にはGoogleログインが必要です' }, 401);

  const body = (await request.json()) as Record<string, unknown>;
  const spaceId = String(body.spaceId || '');
  const reserveDate = String(body.reserveDate || '');
  const startTime = String(body.startTime || '');
  const endTime = String(body.endTime || '');
  const seatsCount = Number(body.seatsCount || 1);

  if (
    !spaceId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reserveDate) ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    !/^\d{2}:\d{2}$/.test(endTime) ||
    startTime >= endTime ||
    !Number.isInteger(seatsCount) ||
    seatsCount < 1 ||
    seatsCount > 4
  ) {
    return jsonResponse({ error: '予約日時の入力値が不正です' }, 400);
  }

  const id = `res-${crypto.randomUUID().slice(0, 10)}`;

  // 同一ユーザーの重複予約防止 + D1原子的定員チェック
  const result = await env.DB.prepare(
    `INSERT INTO reservations (id, space_id, user_sub, reserve_date, start_time, end_time, seats_count, status)
     SELECT ?, ?, ?, ?, ?, ?, ?, 'confirmed'
     WHERE EXISTS (SELECT 1 FROM spaces WHERE id = ? AND is_published = 1)
       AND NOT EXISTS (
         SELECT 1 FROM reservations
         WHERE user_sub = ? AND reserve_date = ? AND status IN ('confirmed', 'checked_in')
           AND NOT (end_time <= ? OR start_time >= ?)
       )
       AND (
         (SELECT total_seats FROM spaces WHERE id = ?) -
         COALESCE((
           SELECT SUM(seats_count) FROM reservations
           WHERE space_id = ? AND reserve_date = ? AND status IN ('confirmed', 'checked_in')
             AND NOT (end_time <= ? OR start_time >= ?)
         ), 0)
       ) >= ?`,
  )
    .bind(
      id,
      spaceId,
      session.sub,
      reserveDate,
      startTime,
      endTime,
      seatsCount,
      spaceId,
      session.sub,
      reserveDate,
      startTime,
      endTime,
      spaceId,
      spaceId,
      reserveDate,
      startTime,
      endTime,
      seatsCount,
    )
    .run();

  if (result.meta.changes !== 1) {
    return jsonResponse(
      { error: '空席不足、または同時間帯に既存の予約があります（二重予約防止）' },
      409,
    );
  }

  return jsonResponse({ ok: true, id }, 201);
};
