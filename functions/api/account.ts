import type { Env } from '../_lib/types';
import { assertSameOrigin, buildCookie, COOKIE_NAME, getSession, jsonResponse } from '../_lib/auth';

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!assertSameOrigin(request)) return jsonResponse({ error: '不正なリクエスト元です' }, 403);
  if (!env.DB) return jsonResponse({ error: 'DB未接続' }, 503);
  const session = await getSession(request, env);
  if (!session) return jsonResponse({ error: 'ログインが必要です' }, 401);
  const version = session.sessionVersion ?? null;
  const owner = `EXISTS (SELECT 1 FROM users WHERE sub = ? AND session_version IS ?)`;
  const results = await env.DB.batch([
    env.DB.prepare(`DELETE FROM reservations WHERE user_sub = ? AND ${owner}`).bind(session.sub, session.sub, version),
    env.DB.prepare(`DELETE FROM favorites WHERE user_sub = ? AND ${owner}`).bind(session.sub, session.sub, version),
    env.DB.prepare('DELETE FROM users WHERE sub = ? AND session_version IS ?').bind(session.sub, version),
  ]);
  if (results[2].meta.changes !== 1) return jsonResponse({ error: 'アカウントを確認できませんでした。' }, 409);
  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': buildCookie(COOKIE_NAME, '', request.url, 0) });
};
