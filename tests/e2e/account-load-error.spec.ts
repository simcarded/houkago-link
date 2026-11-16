import { expect, test } from '@playwright/test';
import { INITIAL_DEMO_SPACES, INITIAL_REGION_STATS } from '../../src/data/demoData';

test.use({ serviceWorkers: 'block' });

test('ログイン中の予約取得失敗を知らせ、再試行で復帰する', async ({ page }) => {
  let fail = true;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { authenticated: true, user: { sub: 'test', displayName: 'Test', isAdmin: false } } });
    if (path === '/api/spaces') return route.fulfill({ json: { spaces: INITIAL_DEMO_SPACES } });
    if (path === '/api/disparity') return route.fulfill({ json: { regions: INITIAL_REGION_STATS } });
    if (path === '/api/favorites') return route.fulfill({ json: { favoriteIds: [] } });
    if (path === '/api/reservations') return route.fulfill(fail ? { status: 503, json: {} } : { json: { reservations: [] } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/mypage');
  await expect(page.getByText('予約を読み込めませんでした。通信状態を確認して再試行してください。')).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: /再試行/ }).click();
  await expect(page.getByText('予約はありません。')).toBeVisible();
});
