import { expect, test } from '@playwright/test';

test.use({serviceWorkers:'block'});
test('データ取扱いページをログインせず確認できる', async ({page}) => {
  await page.goto('/privacy.html');
  await expect(page.getByRole('heading',{name:'放課後Link データの取扱い'})).toBeVisible();
  await expect(page.getByText(/本人が削除するまで保存/)).toBeVisible();
});
test('確認文を入力した本人だけが削除を実行できる', async ({page}) => {
  let deletes = 0;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({json:{authenticated:true,user:{sub:'u',displayName:'Test',isAdmin:false}}});
    if (path === '/api/favorites') return route.fulfill({json:{favoriteIds:[]}});
    if (path === '/api/reservations') return route.fulfill({json:{reservations:[]}});
    if (path === '/api/account') { deletes++; return route.fulfill(deletes === 1 ? {status:503,json:{}} : {json:{ok:true}}); }
    return route.fulfill({status:503,json:{}});
  });
  await page.goto('/mypage');
  await page.getByRole('button',{name:'アカウントと保存データの削除'}).click();
  await expect(page.getByRole('button',{name:'データを削除する'})).toBeDisabled();
  expect(deletes).toBe(0);
  await page.getByLabel('確認入力').fill('削除');
  await page.getByRole('button',{name:'データを削除する'}).click();
  await expect(page.getByRole('alert')).toContainText('削除結果を確認できませんでした');
  await expect(page.getByRole('status')).toHaveCount(0);
  await page.getByRole('button',{name:'データを削除する'}).click();
  await expect(page.getByRole('status')).toContainText('データを削除し、ログアウトしました');
  expect(deletes).toBe(2);
});
