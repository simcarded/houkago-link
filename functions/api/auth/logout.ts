import type { Env } from '../../_lib/types';
import { COOKIE_NAME, assertSameOrigin, buildCookie, jsonResponse } from '../../_lib/auth';

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  if (!assertSameOrigin(request)) {
    return jsonResponse({ error: '不正なリクエスト元です' }, 403);
  }
  return jsonResponse(
    { ok: true },
    200,
    { 'Set-Cookie': buildCookie(COOKIE_NAME, '', request.url, 0) },
  );
};
