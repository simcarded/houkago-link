import { describe, expect, it } from 'vitest';
import { getSession, signToken, assertSameOrigin } from '../../functions/_lib/auth';
import type { Env } from '../../functions/_lib/types';

describe('session authorization', () => {
  const secret = 'a-long-test-secret-that-is-not-a-real-secret';
  it('revokes admin access immediately when the subject is removed from the allowlist', async () => {
    const token = await signToken({ sub: 'former-admin', displayName: 'Test', role: 'admin', exp: Date.now() + 60000 }, secret);
    const request = new Request('https://example.test/api/spaces', { headers: { Cookie: `houkago_session=${token}` } });
    const db = { prepare: () => ({ bind: () => ({ first: async () => ({session_version:null}) }) }) };
    const session = await getSession(request as never, { DB: db, SESSION_SECRET: secret, ADMIN_GOOGLE_SUBS: '' } as unknown as Env);
    expect(session?.role).toBe('user');
  });
  it('rejects expired sessions and foreign origins', async () => {
    const token = await signToken({ sub: 'user', displayName: 'Test', role: 'user', exp: Date.now() - 1 }, secret);
    const request = new Request('https://example.test/api/spaces', { headers: { Cookie: `houkago_session=${token}`, Origin: 'https://elsewhere.test' } });
    expect(await getSession(request as never, { SESSION_SECRET: secret } as Env)).toBeNull();
    expect(assertSameOrigin(request as never)).toBe(false);
  });
  it('treats malformed session cookies as unauthenticated', async () => {
    for (const token of ['bad.%FF', 'bad.!!!']) {
      const request = new Request('https://example.test/api/spaces', { headers: { Cookie: `houkago_session=${token}` } });
      expect(await getSession(request as never, { SESSION_SECRET: secret } as Env)).toBeNull();
    }
  });
});
