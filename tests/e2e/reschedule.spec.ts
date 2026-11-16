import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('予約変更は失敗時に元の予約を残し、成功時に反映する', async ({page}) => {
  let fail = true;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({json:{authenticated:true,user:{sub:'test',displayName:'Test',isAdmin:false}}});
    if (path === '/api/reservations' && route.request().method() === 'GET') return route.fulfill({json:{reservations:[{id:'res-test',spaceId:'s',spaceName:'変更テスト施設',reserveDate:'2099-01-01',startTime:'16:00',endTime:'17:00',seatsCount:1,status:'confirmed'}]}});
    if (path === '/api/reservations/res-test') return route.fulfill(fail ? {status:409,json:{error:'空席不足です'}} : {json:{ok:true}});
    if (path === '/api/favorites') return route.fulfill({json:{favoriteIds:[]}});
    return route.fulfill({status:503,json:{}});
  });
  await page.goto('/mypage');
  await page.getByRole('button',{name:'変更',exact:true}).click();
  await page.getByLabel('開始',{exact:true}).fill('18:00');
  await page.getByLabel('終了',{exact:true}).fill('19:00');
  await page.getByRole('button',{name:'変更を保存'}).click();
  await expect(page.getByRole('alert')).toContainText('空席不足');
  await expect(page.getByText(/16:00〜17:00/)).toBeVisible();
  fail = false;
  await page.getByRole('button',{name:'変更を保存'}).click();
  await expect(page.getByText(/18:00〜19:00/)).toBeVisible();
});
