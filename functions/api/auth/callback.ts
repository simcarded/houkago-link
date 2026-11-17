import type { Env } from '../../_lib/types';
import { verifyGoogleIdToken } from '../../_lib/google-id-token';
import {
  COOKIE_NAME,
  OAUTH_STATE_COOKIE,
  buildCookie,
  parseCookies,
  signToken,
  verifyToken,
} from '../../_lib/auth';

interface OAuthStateToken {
  state: string;
  nonce: string;
  exp: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.SESSION_SECRET) {
    return Response.redirect(`${new URL(request.url).origin}/mypage?auth_error=config`, 302);
  }
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(request.headers.get('Cookie'));
  const rawStateCookie = cookies[OAUTH_STATE_COOKIE];

  if (!code || !state || !rawStateCookie) {
    return Response.redirect(`${url.origin}/mypage?auth_error=state`, 302);
  }

  const parsedState = await verifyToken<OAuthStateToken>(rawStateCookie, env.SESSION_SECRET);
  if (!parsedState || parsedState.state !== state || parsedState.exp < Date.now()) {
    return Response.redirect(`${url.origin}/mypage?auth_error=state_mismatch`, 302);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return Response.redirect(`${url.origin}/mypage?auth_error=token`, 302);
  }

  const tokenJson = (await tokenRes.json()) as { id_token?: string };
  if (!tokenJson.id_token) {
    return Response.redirect(`${url.origin}/mypage?auth_error=id_token`, 302);
  }

  let info;
  try {
    info = await verifyGoogleIdToken(tokenJson.id_token, env.GOOGLE_CLIENT_ID, parsedState.nonce);
  } catch {
    return Response.redirect(`${url.origin}/mypage?auth_error=verify`, 302);
  }

  const displayName = (typeof info.given_name === 'string' ? info.given_name : typeof info.name === 'string' ? info.name : '学習者').slice(0, 24);
  const adminSubs = (env.ADMIN_GOOGLE_SUBS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const role: 'user' | 'admin' = adminSubs.includes(info.sub) ? 'admin' : 'user';

  if (!env.DB) return Response.redirect(`${url.origin}/mypage?auth_error=db`, 302);
  const user = await env.DB.prepare(
    `INSERT INTO users (sub, display_name, role, updated_at, session_version) VALUES (?, ?, ?, datetime('now'), ?)
     ON CONFLICT(sub) DO UPDATE SET display_name = excluded.display_name, role = excluded.role,
       updated_at = datetime('now'), session_version = COALESCE(users.session_version, excluded.session_version)
     RETURNING session_version`,
  ).bind(info.sub, displayName, role, crypto.randomUUID()).first<{ session_version: string }>();
  if (!user?.session_version) return Response.redirect(`${url.origin}/mypage?auth_error=db`, 302);

  const sessionToken = await signToken(
    { sub: info.sub, displayName, role, sessionVersion: user.session_version, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 },
    env.SESSION_SECRET,
  );

  const headers = new Headers({
    Location: `${url.origin}/mypage`,
    'Cache-Control': 'no-store',
  });
  headers.append('Set-Cookie', buildCookie(COOKIE_NAME, sessionToken, request.url, 7 * 24 * 60 * 60));
  headers.append('Set-Cookie', buildCookie(OAUTH_STATE_COOKIE, '', request.url, 0));
  return new Response(null, { status: 302, headers });
};
