import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('終了した予約と取消済み予約を履歴に表示する', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { authenticated: true, user: { sub: 'test', displayName: 'Test', isAdmin: false } } });
    if (path === '/api/favorites') return route.fulfill({ json: { favoriteIds: [] } });
    if (path === '/api/reservations') return route.fulfill({ json: { reservations: [
      { id:'future', spaceName:'今後の施設', reserveDate:'2099-01-01', startTime:'16:00', endTime:'17:00', seatsCount:1, status:'confirmed' },
      { id:'past', spaceName:'過去の施設', reserveDate:'2020-01-01', startTime:'16:00', endTime:'17:00', seatsCount:1, status:'confirmed' },
      { id:'cancelled', spaceName:'取消の施設', reserveDate:'2099-01-01', startTime:'18:00', endTime:'19:00', seatsCount:1, status:'cancelled' },
    ] } });
    return route.fulfill({ status:503, json:{} });
  });
  await page.goto('/mypage');
  await expect(page.getByText('今後の施設')).toBeVisible();
  await expect(page.getByText(/過去の施設（終了）/)).toBeVisible();
  await expect(page.getByText(/取消の施設（取消）/)).toBeVisible();
  await expect(page.getByRole('button', { name:'変更', exact:true })).toHaveCount(1);
});
