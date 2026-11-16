import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRegions, fetchSpaces } from '../../src/lib/api';

describe('empty API responses', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves valid empty results rather than displaying demo data', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(
      url.includes('spaces') ? { spaces: [] } : { regions: [] },
    ), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    expect(await fetchSpaces()).toEqual({ spaces: [], source: 'd1' });
    expect(await fetchRegions()).toEqual({ regions: [], source: 'd1' });
  });

  it('still provides demo data when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    expect((await fetchSpaces()).source).toBe('demo-fallback');
    expect((await fetchRegions()).source).toBe('demo-fallback');
  });
});
