import type { Env } from '../../_lib/types';
import { assertSameOrigin, getSession, jsonResponse } from '../../_lib/auth';

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!assertSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);

  const session = await getSession(request, env);
  if (!session || session.role !== 'admin') {
    return jsonResponse({ error: '管理者権限が必要です' }, 403);
  }

  const id = String(params.id || '');
  const body = (await request.json()) as Record<string, unknown>;

  const updates: string[] = [];
  const binds: unknown[] = [];
  if (typeof body.isPublished === 'boolean') {
    updates.push('is_published = ?');
    binds.push(body.isPublished ? 1 : 0);
  }
  if (typeof body.totalSeats === 'number' && body.totalSeats >= 1 && body.totalSeats <= 500) {
    updates.push('total_seats = ?');
    binds.push(Math.floor(body.totalSeats));
  }
  if (typeof body.feeYen === 'number' && body.feeYen >= 0 && body.feeYen <= 2000) {
    updates.push('fee_yen = ?');
    binds.push(Math.floor(body.feeYen));
  }
  if (typeof body.openTime === 'string' && /^\d{2}:\d{2}$/.test(body.openTime)) {
    updates.push('open_time = ?');
    binds.push(body.openTime);
  }
  if (typeof body.closeTime === 'string' && /^\d{2}:\d{2}$/.test(body.closeTime)) {
    updates.push('close_time = ?');
    binds.push(body.closeTime);
  }

  if (updates.length === 0) {
    return jsonResponse({ error: '更新項目がありません' }, 400);
  }

  binds.push(id);
  const res = await env.DB.prepare(`UPDATE spaces SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();
  return jsonResponse({ ok: true, changes: res.meta.changes });
};
