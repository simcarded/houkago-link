import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestPost } from '../../functions/api/reservations';
import { signToken } from '../../functions/_lib/auth';

describe('reservation capacity with concurrent requests', () => {
  it('accepts only one request for the final seat', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
    db.exec(`INSERT INTO spaces (id,name,provider_type,provider_name,region_id,region_name,address,lat,lng,open_time,close_time,total_seats) VALUES ('s','demo','community','demo','r','r','demo',0,0,'15:00','21:00',1)`);
    const adapter = { prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({ run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args as never[]).changes) } }) }) }) };
    const secret = 'a-long-test-secret-that-is-not-a-real-secret';
    const attempt = async (sub: string) => {
      const token = await signToken({sub,displayName:'test',role:'user',exp:Date.now()+60000},secret);
      const request = new Request('https://example.test/api/reservations',{method:'POST',headers:{Origin:'https://example.test',Cookie:`houkago_session=${token}`,'Content-Type':'application/json'},body:JSON.stringify({spaceId:'s',reserveDate:'2099-01-01',startTime:'16:00',endTime:'17:00',seatsCount:1})});
      return onRequestPost({request,env:{DB:adapter,SESSION_SECRET:secret}} as never);
    };
    const results = await Promise.all([attempt('a'), attempt('b')]);
    expect(results.map((response) => response.status).sort()).toEqual([201,409]);
    expect(db.prepare("SELECT COUNT(*) AS count FROM reservations WHERE status = 'confirmed'").get()?.count).toBe(1);
    db.close();
  });
});
