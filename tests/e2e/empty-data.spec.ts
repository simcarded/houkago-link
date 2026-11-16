import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('実データが空のときにデモ施設へ置き換えない', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/spaces') return route.fulfill({ json: { spaces: [] } });
    if (path === '/api/disparity') return route.fulfill({ json: { regions: [] } });
    if (path === '/api/auth/me') return route.fulfill({ json: { authenticated: false, user: null } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/');
  await expect(page.getByText('放課後の学習スペースを探す')).toBeVisible();
  await expect(page.getByText('現在、表示できる空席のある施設はありません。')).toBeVisible();
  await expect(page.getByText('栄・市民学習ラウンジ')).toHaveCount(0);
  await page.goto('/simulation');
  await expect(page.getByText('企業・自治体の施設提供シミュレーション')).toBeVisible();
});
