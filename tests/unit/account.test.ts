import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestDelete } from '../../functions/api/account';
import { getSession, signToken } from '../../functions/_lib/auth';
import { onRequestPost as createReservation } from '../../functions/api/reservations';

describe('account deletion', () => {
  it('does not recreate a reservation if deletion happens after session verification', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
    db.exec(readFileSync('migrations/0003_session_version.sql', 'utf8'));
    db.exec(`INSERT INTO users (sub,display_name,session_version) VALUES ('u','user','version-1');
      INSERT INTO spaces (id,name,provider_type,provider_name,region_id,region_name,address,lat,lng,open_time,close_time,total_seats) VALUES ('s','demo','community','demo','r','r','demo',0,0,'15:00','21:00',3)`);
    const adapter = {prepare:(sql:string) => ({bind:(...args:unknown[]) => ({
      first: async () => { const result = db.prepare(sql).get(...args as never[]) ?? null; db.exec("DELETE FROM users WHERE sub='u'"); return result; },
      run: async () => ({meta:{changes:Number(db.prepare(sql).run(...args as never[]).changes)}}),
    })})};
    const secret = 'a-long-test-secret-that-is-not-a-real-secret';
    const token = await signToken({sub:'u',displayName:'user',role:'user',sessionVersion:'version-1',exp:Date.now()+60000},secret);
    const request = new Request('https://example.test/api/reservations',{method:'POST',headers:{Cookie:`houkago_session=${token}`,Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({spaceId:'s',reserveDate:'2099-01-01',startTime:'16:00',endTime:'17:00',seatsCount:1})});
    expect((await createReservation({request,env:{DB:adapter,SESSION_SECRET:secret}} as never)).status).toBe(409);
    expect(db.prepare('SELECT COUNT(*) AS count FROM reservations').get()?.count).toBe(0);
    db.close();
  });
  it('deletes only the owner data and invalidates old sessions even after re-registration', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
    db.exec(readFileSync('migrations/0003_session_version.sql', 'utf8'));
    db.exec(`INSERT INTO users (sub,display_name,session_version) VALUES ('u','user','version-1'),('other','other','version-2');
      INSERT INTO spaces (id,name,provider_type,provider_name,region_id,region_name,address,lat,lng,open_time,close_time,total_seats) VALUES ('s','demo','community','demo','r','r','demo',0,0,'15:00','21:00',3);
      INSERT INTO reservations (id,space_id,user_sub,reserve_date,start_time,end_time,seats_count) VALUES ('r1','s','u','2099-01-01','16:00','17:00',1),('r2','s','other','2099-01-01','16:00','17:00',1);
      INSERT INTO favorites (user_sub,space_id) VALUES ('u','s'),('other','s')`);
    const adapter = {
      prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({
        first: async () => db.prepare(sql).get(...args as never[]) ?? null,
        run: () => ({ meta: { changes: Number(db.prepare(sql).run(...args as never[]).changes) } }),
      }) }),
      batch: async (statements: Array<{run: () => unknown}>) => {
        db.exec('BEGIN');
        try { const result = statements.map((s) => s.run()); db.exec('COMMIT'); return result; }
        catch (error) { db.exec('ROLLBACK'); throw error; }
      },
    };
    const secret = 'a-long-test-secret-that-is-not-a-real-secret';
    const token = await signToken({sub:'u',displayName:'user',role:'user',sessionVersion:'version-1',exp:Date.now()+60000}, secret);
    const headers = {Cookie:`houkago_session=${token}`,Origin:'https://example.test'};
    const request = new Request('https://example.test/api/account',{method:'DELETE',headers});
    const env = {DB:adapter,SESSION_SECRET:secret};
    const foreign = new Request('https://example.test/api/account',{method:'DELETE',headers:{...headers,Origin:'https://attacker.test'}});
    expect((await onRequestDelete({request:foreign,env} as never)).status).toBe(403);
    expect(db.prepare('SELECT COUNT(*) AS count FROM users').get()?.count).toBe(2);
    expect((await onRequestDelete({request,env} as never)).status).toBe(200);
    expect(db.prepare('SELECT sub FROM users').all()).toEqual([{sub:'other'}]);
    expect(db.prepare('SELECT user_sub FROM reservations').all()).toEqual([{user_sub:'other'}]);
    expect(db.prepare('SELECT user_sub FROM favorites').all()).toEqual([{user_sub:'other'}]);
    expect(await getSession(request, env as never)).toBeNull();
    db.exec("INSERT INTO users (sub,display_name,session_version) VALUES ('u','user','new-version')");
    expect(await getSession(request, env as never)).toBeNull();
    expect((await onRequestDelete({request,env} as never)).status).toBe(401);
    expect(db.prepare("SELECT session_version FROM users WHERE sub='u'").get()?.session_version).toBe('new-version');
    db.exec("INSERT INTO users (sub,display_name) VALUES ('legacy','legacy')");
    const legacyToken = await signToken({sub:'legacy',displayName:'legacy',role:'user',exp:Date.now()+60000},secret);
    const legacyRequest = new Request('https://example.test/api/account',{method:'DELETE',headers:{Cookie:`houkago_session=${legacyToken}`,Origin:'https://example.test'}});
    expect(await getSession(legacyRequest, env as never)).not.toBeNull();
    expect((await onRequestDelete({request:legacyRequest,env} as never)).status).toBe(200);
    db.exec("INSERT INTO users (sub,display_name,session_version) VALUES ('legacy','legacy','fresh-version')");
    expect(await getSession(legacyRequest, env as never)).toBeNull();
    db.close();
  });
});
