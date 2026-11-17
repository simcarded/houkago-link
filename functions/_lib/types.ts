export interface Env {
  DB?: D1Database;
  AI?: Ai;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  ADMIN_GOOGLE_SUBS?: string;
}

export interface SessionPayload {
  sub: string;
  displayName: string;
  role: 'user' | 'admin';
  exp: number;
  sessionVersion?: string;
}
