import { describe, expect, it } from 'vitest';
import { onRequestPost } from '../../functions/api/reservations';
import { signToken } from '../../functions/_lib/auth';

describe('reservation API', () => {
  it('binds all capacity and opening-hour parameters in order', async () => {
    const secret = 'test-secret-long-enough-for-hmac';
    const token = await signToken({sub:'test',displayName:'test',role:'user',exp:Date.now()+60000}, secret);
    let sql = ''; let params: unknown[] = [];
    const db = { prepare: (query: string) => { sql = query; return { bind: (...values: unknown[]) => { params = values; return { run: async () => ({meta:{changes:1}}) }; } }; } };
    const request = new Request('https://example.test/api/reservations',{method:'POST',headers:{Origin:'https://example.test',Cookie:`houkago_session=${token}`,'Content-Type':'application/json'},body:JSON.stringify({spaceId:'space',reserveDate:'2099-01-01',startTime:'16:00',endTime:'18:00',seatsCount:1})});
    const response = await onRequestPost({request,env:{DB:db,SESSION_SECRET:secret}} as never);
    expect(response.status).toBe(201);
    expect(params.length).toBe((sql.match(/\?/g) || []).length);
    expect(params.slice(7,10)).toEqual(['space','16:00','18:00']);
  });
});
