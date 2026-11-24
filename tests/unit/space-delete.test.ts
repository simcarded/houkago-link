import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestDelete } from '../../functions/api/spaces/[id]';
import { signToken } from '../../functions/_lib/auth';

describe('facility deletion safety', () => {
  it('allows admins to delete unused facilities but preserves any with reservations or favorites', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
    db.exec(readFileSync('migrations/0003_session_version.sql', 'utf8'));
    db.exec("INSERT INTO users (sub,display_name,role) VALUES ('admin','admin','admin'),('learner','learner','user')");
    db.exec(`INSERT INTO spaces (id,name,provider_type,provider_name,region_id,region_name,address,lat,lng,open_time,close_time,total_seats,is_demo) VALUES
      ('unused','unused','community','test','r','r','sample',35,137,'15:00','21:00',2,1),
      ('reserved','reserved','community','test','r','r','sample',35,137,'15:00','21:00',2,1),
      ('favorited','favorited','community','test','r','r','sample',35,137,'15:00','21:00',2,0)`);
    db.exec("INSERT INTO reservations (id,space_id,user_sub,reserve_date,start_time,end_time) VALUES ('reservation-1','reserved','learner','2099-01-01','16:00','17:00')");
    db.exec("INSERT INTO favorites (user_sub,space_id) VALUES ('learner','favorited')");

    const adapter = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => db.prepare(sql).get(...args as never[]) ?? null,
          run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args as never[]).changes) } }),
        }),
      }),
    };
    const secret = 'a-long-test-secret-that-is-not-a-real-secret';
    const token = await signToken({ sub: 'admin', displayName: 'admin', role: 'admin', exp: Date.now() + 60000 }, secret);
    const request = new Request('https://example.test/api/spaces/unused', {
      method: 'DELETE', headers: { Origin: 'https://example.test', Cookie: `houkago_session=${token}` },
    });
    const env = { DB: adapter, SESSION_SECRET: secret, ADMIN_GOOGLE_SUBS: 'admin' };

    const response = await onRequestDelete({ request, env, params: { id: 'unused' } } as never);
    const reservedResponse = await onRequestDelete({ request, env, params: { id: 'reserved' } } as never);
    const favoritedResponse = await onRequestDelete({ request, env, params: { id: 'favorited' } } as never);
    expect(response.status).toBe(200);
    expect(reservedResponse.status).toBe(409);
    expect(favoritedResponse.status).toBe(409);
    expect(db.prepare('SELECT COUNT(*) AS count FROM reservations WHERE id = ?').get('reservation-1')?.count).toBe(1);
    expect(db.prepare('SELECT COUNT(*) AS count FROM favorites WHERE user_sub = ?').get('learner')?.count).toBe(1);
    db.close();
  });
});
