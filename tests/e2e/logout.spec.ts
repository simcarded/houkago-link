import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('別タブでアカウントが切り替わったら元の個人予約を隠す', async ({ page }) => {
  let account = 'first';
  let releaseCheck!: () => void;
  const waitForCheck = new Promise<void>((resolve) => { releaseCheck = resolve; });
  let delayCheck = false;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') {
      if (delayCheck) { delayCheck = false; await waitForCheck; }
      return route.fulfill({json:{authenticated:true,user:{sub:account,displayName:account,isAdmin:false}}});
    }
    if (path === '/api/reservations') return route.fulfill({json:{reservations:account === 'first' ? [{id:'res-private',spaceName:'最初の利用者の予約',reserveDate:'2099-01-01',startTime:'16:00',endTime:'17:00',seatsCount:1,status:'confirmed'}] : []}});
    if (path === '/api/favorites') return route.fulfill({json:{favoriteIds:[]}});
    return route.fulfill({status:503,json:{}});
  });
  await page.goto('/mypage');
  await expect(page.getByText('最初の利用者の予約')).toBeVisible();
  account = 'second';
  delayCheck = true;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('最初の利用者の予約')).toHaveCount(0);
  releaseCheck();
  await expect(page.getByText('Googleアカウント連携中（表示名: second）')).toBeVisible();
  await expect(page.getByText('最初の利用者の予約')).toHaveCount(0);
});

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

test('旧バージョンが保存した実予約は未ログイン時に表示しない', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('houkago_demo_reservations', JSON.stringify([{id:'res-old-private',spaceName:'旧個人予約',reserveDate:'2099-01-01',startTime:'16:00',endTime:'17:00',seatsCount:1,status:'confirmed'}])));
  await page.route('**/api/**', route => route.fulfill({status:503,json:{}}));
  await page.goto('/mypage');
  await expect(page.getByText('旧個人予約')).toHaveCount(0);
  await expect(page.getByText('予約はありません。')).toBeVisible();
});

test('未ログイン時は認証必須の予約・お気に入りAPIを呼ばない', async ({page}) => {
  const privateRequests: string[] = [];
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/reservations' || path === '/api/favorites') privateRequests.push(path);
    if (path === '/api/auth/me') return route.fulfill({json:{authenticated:false,user:null}});
    return route.fulfill({status:503,json:{}});
  });
  await page.goto('/mypage');
  await expect(page.getByText(/未ログイン状態/)).toBeVisible();
  expect(privateRequests).toEqual([]);
});
