import type { Env } from '../../_lib/types';
import { OAUTH_STATE_COOKIE, buildCookie, jsonResponse, signToken } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GOOGLE_CLIENT_ID || !env.SESSION_SECRET) {
    return jsonResponse(
      { error: 'Google OAuth環境変数が未設定です。Cloudflare Secretsを設定してください。' },
      503,
    );
  }
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const signedState = await signToken({ state, nonce, exp: Date.now() + 10 * 60 * 1000 }, env.SESSION_SECRET);
  const redirectUri = `${new URL(request.url).origin}/api/auth/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('prompt', 'select_account');

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Set-Cookie': buildCookie(OAUTH_STATE_COOKIE, signedState, request.url, 600),
      'Cache-Control': 'no-store',
    },
  });
};
