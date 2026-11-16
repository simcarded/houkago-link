import type { Env, SessionPayload } from './types';

const COOKIE_NAME = 'houkago_session';
const OAUTH_STATE_COOKIE = 'houkago_oauth_state';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signToken(payload: object, secret: string): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyToken<T>(token: string, secret: string): Promise<T | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sigB64] = parts;
  const key = await importHmacKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    fromBase64Url(sigB64),
    new TextEncoder().encode(body),
  );
  if (!valid) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as T;
  } catch {
    return null;
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export function buildCookie(
  name: string,
  value: string,
  requestUrl: string,
  maxAgeSec: number,
): string {
  const isHttps = new URL(requestUrl).protocol === 'https:';
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (isHttps) attrs.push('Secure');
  return attrs.join('; ');
}

export async function getSession(request: Request, env: Env): Promise<SessionPayload | null> {
  if (!env.SESSION_SECRET) return null;
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const payload = await verifyToken<SessionPayload>(token, env.SESSION_SECRET);
  if (!payload || payload.exp < Date.now()) return null;
  const adminSubs = (env.ADMIN_GOOGLE_SUBS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    ...payload,
    role: adminSubs.includes(payload.sub) ? 'admin' : 'user',
  };
}

export function assertSameOrigin(request: Request): boolean {
  const reqOrigin = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (origin) return origin === reqOrigin;
  const referer = request.headers.get('Referer');
  if (referer) {
    try {
      return new URL(referer).origin === reqOrigin;
    } catch {
      return false;
    }
  }
  return false;
}

export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export { COOKIE_NAME, OAUTH_STATE_COOKIE };
