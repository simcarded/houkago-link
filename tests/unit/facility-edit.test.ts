import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestPatch } from '../../functions/api/spaces/[id]';
import { signToken } from '../../functions/_lib/auth';

describe('facility editing', () => {
  it('allows administrators to edit and prevents changes conflicting with reservations', async () => {
    const db = new DatabaseSync(':memory:'); db.exec(readFileSync('migrations/0001_init.sql','utf8'));
    db.exec(readFileSync('migrations/0003_session_version.sql', 'utf8'));
    db.exec("INSERT INTO users (sub,display_name) VALUES ('ordinary','ordinary'),('admin','admin')");
    db.exec(`INSERT INTO spaces (id,name,provider_type,provider_name,region_id,region_name,address,lat,lng,open_time,close_time,total_seats) VALUES ('s','demo','community','demo','r','r','demo',0,0,'15:00','21:00',5);
      INSERT INTO reservations (id,space_id,user_sub,reserve_date,start_time,end_time,seats_count) VALUES ('one','s','u','2099-01-01','16:00','18:00',2),('two','s','v','2099-01-01','17:00','19:00',2)`);
    const adapter = { prepare: (sql:string) => ({ bind: (...args:unknown[]) => ({ first: async () => db.prepare(sql).get(...args as never[]) ?? null, run: async () => ({meta:{changes:Number(db.prepare(sql).run(...args as never[]).changes)}}) }) }) };
    const secret='a-long-test-secret-that-is-not-a-real-secret';
    const update=async (sub:string, body:object) => { const token=await signToken({sub,displayName:'Test',role:'user',exp:Date.now()+60000},secret); return onRequestPatch({request:new Request('https://example.test/api/spaces/s',{method:'PATCH',headers:{Origin:'https://example.test',Cookie:`houkago_session=${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)}),env:{DB:adapter,SESSION_SECRET:secret,ADMIN_GOOGLE_SUBS:'admin'},params:{id:'s'}} as never); };
    expect((await update('ordinary',{name:'改名'})).status).toBe(403);
    expect((await update('admin',{openTime:'99:00'})).status).toBe(400);
    expect((await update('admin',{totalSeats:3})).status).toBe(409);
    expect((await update('admin',{closeTime:'18:00'})).status).toBe(409);
    expect((await update('admin',{name:'編集済み',wifi:true,totalSeats:4,openTime:'15:00',closeTime:'20:00'})).status).toBe(200);
    expect(db.prepare("SELECT name, wifi, total_seats FROM spaces WHERE id='s'").get()).toMatchObject({name:'編集済み',wifi:1,total_seats:4});
    db.close();
  });
});
