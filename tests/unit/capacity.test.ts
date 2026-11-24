import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestPost } from '../../functions/api/reservations';
import { signToken } from '../../functions/_lib/auth';
import { onRequestPatch } from '../../functions/api/reservations/[id]';

describe('reservation capacity with concurrent requests', () => {
  it('counts the peak simultaneous occupancy for creation and rescheduling', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
    db.exec(readFileSync('migrations/0003_session_version.sql', 'utf8'));
    db.exec("INSERT INTO users (sub,display_name) VALUES ('u','u'),('a','a'),('b','b')");
    db.exec(`INSERT INTO spaces (id,name,provider_type,provider_name,region_id,region_name,address,lat,lng,open_time,close_time,total_seats,is_demo) VALUES ('s','demo','community','demo','r','r','demo',0,0,'15:00','21:00',2,0);
      INSERT INTO reservations (id,space_id,user_sub,reserve_date,start_time,end_time,seats_count) VALUES
      ('a','s','a','2099-01-01','16:00','17:00',1), ('b','s','b','2099-01-01','17:00','18:00',1),
      ('mine','s','u','2099-01-01','19:00','20:00',1)`);
    const adapter = { prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({ first: async () => db.prepare(sql).get(...args as never[]) ?? null, run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args as never[]).changes) } }) }) }) };
    const secret = 'a-long-test-secret-that-is-not-a-real-secret';
    const token = await signToken({ sub:'u', displayName:'test', role:'user', exp:Date.now()+60000 }, secret);
    const request = (method: string, body: object) => new Request('https://example.test/api/reservations', {method, headers:{Origin:'https://example.test',Cookie:`houkago_session=${token}`,'Content-Type':'application/json'}, body:JSON.stringify(body)});
    const slot = {spaceId:'s',reserveDate:'2099-01-01',startTime:'16:00',endTime:'18:00',seatsCount:1};
    expect((await onRequestPost({request:request('POST',slot),env:{DB:adapter,SESSION_SECRET:secret}} as never)).status).toBe(201);
    db.exec("DELETE FROM reservations WHERE user_sub = 'u' AND id != 'mine'");
    expect((await onRequestPatch({request:request('PATCH',{...slot,action:'reschedule'}),env:{DB:adapter,SESSION_SECRET:secret},params:{id:'mine'}} as never)).status).toBe(200);
    db.exec("UPDATE reservations SET start_time='16:30' WHERE id='b'");
    expect((await onRequestPatch({request:request('PATCH',{...slot,action:'reschedule'}),env:{DB:adapter,SESSION_SECRET:secret},params:{id:'mine'}} as never)).status).toBe(409);
    db.close();
  });
  it('accepts only one request for the final seat', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
    db.exec(readFileSync('migrations/0003_session_version.sql', 'utf8'));
    db.exec("INSERT INTO users (sub,display_name) VALUES ('a','a'),('b','b')");
    db.exec(`INSERT INTO spaces (id,name,provider_type,provider_name,region_id,region_name,address,lat,lng,open_time,close_time,total_seats,is_demo) VALUES ('s','demo','community','demo','r','r','demo',0,0,'15:00','21:00',1,0)`);
    const adapter = { prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({ first: async () => db.prepare(sql).get(...args as never[]) ?? null, run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args as never[]).changes) } }) }) }) };
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
