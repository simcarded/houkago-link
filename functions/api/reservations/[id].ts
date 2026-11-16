import type { Env } from '../../_lib/types';
import { assertSameOrigin, getSession, jsonResponse } from '../../_lib/auth';

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!assertSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);

  const session = await getSession(request, env);
  if (!session) return jsonResponse({ error: '認証が必要です' }, 401);

  const id = String(params.id || '');
  const body = (await request.json()) as Record<string, unknown>;
  const status = String(body.status || '');

  if (status === 'cancelled' || status === 'checked_in') {
    const query =
      session.role === 'admin'
        ? `UPDATE reservations SET status = ? WHERE id = ?`
        : `UPDATE reservations SET status = ? WHERE id = ? AND user_sub = ?`;
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
