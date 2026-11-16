import type { Env } from '../_lib/types';
import { jsonResponse } from '../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  let dbReady = false;
  if (env.DB) {
    try {
      await env.DB.prepare('SELECT 1').first();
      dbReady = true;
    } catch {
      dbReady = false;
    }
  }
  return jsonResponse({
    ok: true,
    dbReady,
    aiReady: Boolean(env.AI),
    oauthConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET),
  });
};
