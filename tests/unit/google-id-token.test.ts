import { describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { verifyGoogleIdToken } from '../../functions/_lib/google-id-token';

describe('Google ID token verification', () => {
  it('accepts only a correctly signed, unexpired token with matching issuer, audience and nonce', async () => {
    const pair = await generateKeyPair('RS256');
    const jwk = { ...await exportJWK(pair.publicKey), kid:'test-key', alg:'RS256' };
    const key = createLocalJWKSet({keys:[jwk]});
    const make = (claims: Record<string, unknown> = {}, options: {issuer?:string; audience?:string; expires?:string} = {}) =>
      new SignJWT({nonce:'expected',...claims}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(options.issuer || 'https://accounts.google.com').setAudience(options.audience || 'client-id').setSubject('user-sub').setIssuedAt().setExpirationTime(options.expires || '5m').sign(pair.privateKey);
    expect((await verifyGoogleIdToken(await make(), 'client-id', 'expected', key)).sub).toBe('user-sub');
    await expect(verifyGoogleIdToken(await make({nonce:'wrong'}), 'client-id', 'expected', key)).rejects.toThrow();
    await expect(verifyGoogleIdToken(await make({}, {issuer:'https://attacker.test'}), 'client-id', 'expected', key)).rejects.toThrow();
    await expect(verifyGoogleIdToken(await make({}, {audience:'other-client'}), 'client-id', 'expected', key)).rejects.toThrow();
    await expect(verifyGoogleIdToken(await make({}, {expires:'-1s'}), 'client-id', 'expected', key)).rejects.toThrow();
    const other = await generateKeyPair('RS256');
    const forged = await new SignJWT({nonce:'expected'}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer('https://accounts.google.com').setAudience('client-id').setSubject('user-sub').setIssuedAt().setExpirationTime('5m').sign(other.privateKey);
    await expect(verifyGoogleIdToken(forged, 'client-id', 'expected', key)).rejects.toThrow();
  });
});
