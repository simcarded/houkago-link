import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestGet } from '../../functions/api/availability';
import { signToken } from '../../functions/_lib/auth';

describe('selected-time availability', () => {
  it('counts peak occupancy and excludes cancellations', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(readFileSync('migrations/0001_init.sql', 'utf8'));
    db.exec(readFileSync('migrations/0003_session_version.sql', 'utf8'));
    db.exec("INSERT INTO users (sub,display_name) VALUES ('u','u')");
    db.exec(`INSERT INTO spaces (id,name,provider_type,provider_name,region_id,region_name,address,lat,lng,open_time,close_time,total_seats) VALUES ('s','demo','community','demo','r','r','demo',0,0,'15:00','21:00',3);
      INSERT INTO reservations (id,space_id,user_sub,reserve_date,start_time,end_time,seats_count,status) VALUES
      ('a','s','a','2099-01-01','16:00','17:00',1,'confirmed'), ('b','s','b','2099-01-01','17:00','18:00',1,'checked_in'),
      ('c','s','c','2099-01-01','16:00','18:00',2,'cancelled')`);
    const adapter = { prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({ first: async () => db.prepare(sql).get(...args as never[]) ?? null }) }) };
    const secret = 'a-long-test-secret-that-is-not-a-real-secret';
    const token = await signToken({sub:'u',displayName:'test',role:'user',exp:Date.now()+60000},secret);
    const request = new Request('https://example.test/api/availability?spaceId=s&reserveDate=2099-01-01&startTime=16%3A00&endTime=18%3A00',{headers:{Cookie:`houkago_session=${token}`}});
    const response = await onRequestGet({request,env:{DB:adapter,SESSION_SECRET:secret}} as never);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({availableSeats:2});
    db.exec("UPDATE reservations SET start_time='16:30', seats_count=2 WHERE id='b'");
    const full = await onRequestGet({request,env:{DB:adapter,SESSION_SECRET:secret}} as never);
    expect(await full.json()).toEqual({availableSeats:0});
    db.close();
  });
});
