import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestPatch } from '../../functions/api/reservations/[id]';
import { signToken } from '../../functions/_lib/auth';

describe('reservation changes in SQLite', () => {
  it('changes only the owner’s reservation and preserves it when capacity is insufficient', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
    db.exec(`INSERT INTO spaces (id,name,provider_type,provider_name,region_id,region_name,address,lat,lng,open_time,close_time,total_seats) VALUES ('s','demo','community','demo','r','r','demo',0,0,'15:00','21:00',2);
      INSERT INTO reservations (id,space_id,user_sub,reserve_date,start_time,end_time,seats_count) VALUES ('mine','s','u','2099-01-01','16:00','17:00',1),('other','s','v','2099-01-01','18:00','19:00',2)`);
    const adapter = { prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({ run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args as never[]).changes) } }) }) }) };
    const secret = 'a-long-test-secret-that-is-not-a-real-secret';
    const token = await signToken({ sub: 'u', displayName:'test', role:'user', exp:Date.now()+60000 }, secret);
    const change = async (id: string, startTime: string, endTime: string) => onRequestPatch({request: new Request('https://example.test/api/reservations/'+id, { method:'PATCH', headers: { Origin:'https://example.test', Cookie:`houkago_session=${token}`, 'Content-Type':'application/json' }, body:JSON.stringify({ action:'reschedule',reserveDate:'2099-01-01',startTime,endTime,seatsCount:1 }) }),env:{DB:adapter,SESSION_SECRET:secret},params:{id}} as never);
    expect((await change('mine','18:00','19:00')).status).toBe(409);
    expect(db.prepare("SELECT start_time FROM reservations WHERE id='mine'").get()?.start_time).toBe('16:00');
    expect((await change('other','19:00','20:00')).status).toBe(409);
    expect((await change('mine','19:00','20:00')).status).toBe(200);
    expect(db.prepare("SELECT start_time FROM reservations WHERE id='mine'").get()?.start_time).toBe('19:00');
    db.close();
  });
});
