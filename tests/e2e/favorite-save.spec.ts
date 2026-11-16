import { expect, test } from '@playwright/test';
import { INITIAL_DEMO_SPACES, INITIAL_REGION_STATS } from '../../src/data/demoData';

test.use({ serviceWorkers: 'block' });

test('お気に入りは保存失敗を表示し、成功時だけ切り替える', async ({ page }) => {
  const space = INITIAL_DEMO_SPACES[0];
  let fail = true;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { authenticated: true, user: { sub: 'test', displayName: 'Test', isAdmin: false } } });
    if (path === '/api/spaces') return route.fulfill({ json: { spaces: [space] } });
    if (path === '/api/disparity') return route.fulfill({ json: { regions: INITIAL_REGION_STATS } });
    if (path === '/api/reservations') return route.fulfill({ json: { reservations: [] } });
    if (path === '/api/favorites' && route.request().method() === 'GET') return route.fulfill({ json: { favoriteIds: [] } });
    if (path === '/api/favorites') return route.fulfill(fail ? { status: 503, json: {} } : { json: { ok: true } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/');
  await page.getByRole('heading', { name: space.name }).click();
  const favorite = page.getByRole('button', { name: 'お気に入り切替' });
  await favorite.click();
  await expect(page.getByRole('alert')).toContainText('お気に入りを保存できませんでした');
  await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  fail = false;
  await favorite.click();
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
