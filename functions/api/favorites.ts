import type { Env } from '../_lib/types';
import { assertSameOrigin, getSession, jsonResponse } from '../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);
  const session = await getSession(request, env);
  if (!session) return jsonResponse({ error: '認証が必要です' }, 401);

  const { results } = await env.DB.prepare('SELECT space_id FROM favorites WHERE user_sub = ? AND EXISTS (SELECT 1 FROM users WHERE sub = ? AND session_version IS ?)')
    .bind(session.sub, session.sub, session.sessionVersion ?? null)
    .all<{ space_id: string }>();
  return jsonResponse({ favoriteIds: (results || []).map((r) => r.space_id) });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!assertSameOrigin(request)) return jsonResponse({ error: 'Forbidden' }, 403);
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);
  const session = await getSession(request, env);
  if (!session) return jsonResponse({ error: '認証が必要です' }, 401);

  const body = (await request.json()) as { spaceId?: string; favorite?: boolean };
  if (!body.spaceId) return jsonResponse({ error: 'spaceId必須' }, 400);

  if (body.favorite) {
    await env.DB.prepare('INSERT OR IGNORE INTO favorites (user_sub, space_id) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM users WHERE sub = ? AND session_version IS ?) AND EXISTS (SELECT 1 FROM spaces WHERE id = ? AND is_published = 1 AND is_demo = 0)')
      .bind(session.sub, body.spaceId, session.sub, session.sessionVersion ?? null, body.spaceId)
      .run();
  } else {
    await env.DB.prepare('DELETE FROM favorites WHERE user_sub = ? AND space_id = ? AND EXISTS (SELECT 1 FROM users WHERE sub = ? AND session_version IS ?)')
      .bind(session.sub, body.spaceId, session.sub, session.sessionVersion ?? null)
      .run();
  }
  return jsonResponse({ ok: true });
};
