import { expect, test } from '@playwright/test';

test('ログアウトすると他の利用者の予約が残らない', async ({ page }) => {
  let loggedIn = true;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/logout') { loggedIn = false; return route.fulfill({ json: { ok: true } }); }
    if (path === '/api/auth/me') return route.fulfill({ json: loggedIn ? {authenticated:true,user:{sub:'test',displayName:'Test',isAdmin:false}} : {authenticated:false,user:null} });
    if (path === '/api/reservations' && loggedIn) return route.fulfill({ json: { reservations: [{id:'private-test',spaceName:'個人の予約テスト',reserveDate:'2099-01-01',startTime:'16:00',endTime:'17:00',seatsCount:1,status:'confirmed'}] } });
    if (path === '/api/favorites' && loggedIn) return route.fulfill({ json: {favoriteIds:[]} });
    return route.fulfill({ status: 503, json: {} });
  });
  await page.goto('/mypage');
  await expect(page.getByText('個人の予約テスト')).toBeVisible();
  await page.getByRole('button', {name:'ログアウト'}).click();
  await expect(page.getByText('個人の予約テスト')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('個人の予約テスト')).toHaveCount(0);
});
