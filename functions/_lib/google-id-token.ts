import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

// Google's published OpenID Connect key endpoint. jose caches keys and respects rotation.
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export async function verifyGoogleIdToken(token: string, audience: string, nonce: string, key: JWTVerifyGetKey = googleKeys) {
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['RS256'],
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience,
    requiredClaims: ['exp', 'iat', 'sub'],
  });
  if (payload.nonce !== nonce || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255) {
    throw new Error('Invalid identity token');
  }
  return { ...payload, sub: payload.sub, given_name: payload.given_name, name: payload.name };
}
