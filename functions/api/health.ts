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
    aiReady: false, // Inference is intentionally disabled until a safe usage limit is established.
    oauthConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET),
  });
};
