import type { Env } from '../../_lib/types';
import { getSession, jsonResponse } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getSession(request, env);
  if (!session) {
    return jsonResponse({ authenticated: false, user: null });
  }
  return jsonResponse({
    authenticated: true,
    user: {
      sub: session.sub,
      displayName: session.displayName,
      isAdmin: session.role === 'admin',
    },
  });
};
