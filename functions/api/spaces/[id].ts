import type { Env } from '../../_lib/types';
import { assertSameOrigin, getSession, jsonResponse } from '../../_lib/auth';

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!assertSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);
  const session = await getSession(request, env);
  if (!session || session.role !== 'admin') return jsonResponse({ error: '管理者権限が必要です' }, 403);

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return jsonResponse({ error: '入力内容が不正です' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return jsonResponse({ error: '入力内容が不正です' }, 400);
  const updates: string[] = [];
  const binds: unknown[] = [];
  const textFields: Record<string, [string, number]> = { name:['name',80], providerName:['provider_name',80], address:['address',120], notes:['notes',200] };
  const flags: Record<string, string> = { isPublished:'is_published', wifi:'wifi', outlets:'outlets', quiet:'quiet', soloOk:'solo_ok', groupOk:'group_ok', barrierFree:'barrier_free' };
  const numbers: Record<string, [string, number, number]> = { totalSeats:['total_seats',1,500], feeYen:['fee_yen',0,2000] };
  const times: Record<string, string> = { openTime:'open_time', closeTime:'close_time' };
  for (const [key, value] of Object.entries(body)) {
    if (Object.hasOwn(textFields, key)) {
      const [column, max] = textFields[key];
      if (typeof value !== 'string' || value.length > max || (key !== 'notes' && !value.trim())) return jsonResponse({ error: '入力内容を確認してください' }, 400);
      updates.push(`${column} = ?`); binds.push(value.trim());
    } else if (Object.hasOwn(flags, key)) {
      if (typeof value !== 'boolean') return jsonResponse({ error: '設備の指定が不正です' }, 400);
      if (key === 'isPublished' && value) {
        const space = await env.DB.prepare('SELECT is_demo FROM spaces WHERE id = ?').bind(String(params.id || '')).first<{ is_demo: number }>();
        if (space?.is_demo) return jsonResponse({ error: 'サンプル施設は一般公開できません。実在施設の情報として登録し直してください。' }, 409);
      }
      updates.push(`${flags[key]} = ?`); binds.push(value ? 1 : 0);
    } else if (Object.hasOwn(numbers, key)) {
      const [column, min, max] = numbers[key];
      if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return jsonResponse({ error: '座席数または料金が不正です' }, 400);
      updates.push(`${column} = ?`); binds.push(value);
    } else if (Object.hasOwn(times, key)) {
      if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return jsonResponse({ error: '営業時間が不正です' }, 400);
      updates.push(`${times[key]} = ?`); binds.push(value);
    } else return jsonResponse({ error: '更新できない項目です' }, 400);
  }
  if (!updates.length) return jsonResponse({ error: '更新項目がありません' }, 400);

  const openTime = typeof body.openTime === 'string' ? body.openTime : null;
  const closeTime = typeof body.closeTime === 'string' ? body.closeTime : null;
  const totalSeats = typeof body.totalSeats === 'number' ? body.totalSeats : null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Tokyo', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  // Preserve active reservations when changing opening hours or capacity. The update is a single atomic D1 statement.
  const sql = `UPDATE spaces SET ${updates.join(', ')} WHERE id = ?
    AND COALESCE(?, open_time) < COALESCE(?, close_time)
    AND NOT EXISTS (SELECT 1 FROM reservations r WHERE r.space_id = spaces.id AND r.reserve_date >= ? AND r.status IN ('confirmed', 'checked_in') AND (
      r.start_time < COALESCE(?, spaces.open_time) OR r.end_time > COALESCE(?, spaces.close_time) OR
      (SELECT COALESCE(SUM(x.seats_count), 0) FROM reservations x WHERE x.space_id = spaces.id AND x.reserve_date = r.reserve_date
        AND x.status IN ('confirmed', 'checked_in') AND x.start_time <= r.start_time AND x.end_time > r.start_time) > COALESCE(?, spaces.total_seats)))`;
  const result = await env.DB.prepare(sql).bind(...binds, String(params.id || ''), openTime, closeTime, today, openTime, closeTime, totalSeats).run();
  if (result.meta.changes !== 1) return jsonResponse({ error: '施設が見つからないか、営業時間・座席数が既存の予約と矛盾します。' }, 409);
  return jsonResponse({ ok:true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!assertSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);
  const session = await getSession(request, env);
  if (!session || session.role !== 'admin') return jsonResponse({ error: '管理者権限が必要です' }, 403);

  const result = await env.DB.prepare(`DELETE FROM spaces WHERE id = ?
    AND NOT EXISTS (SELECT 1 FROM reservations WHERE space_id = spaces.id)
    AND NOT EXISTS (SELECT 1 FROM favorites WHERE space_id = spaces.id)`)
    .bind(String(params.id || ''))
    .run();
  if (result.meta.changes !== 1) {
    return jsonResponse({ error: '削除できません。予約やお気に入りがある施設、またはサンプル施設以外は削除できません。' }, 409);
  }
  return jsonResponse({ ok: true });
};
