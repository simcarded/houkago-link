import { expect, test } from '@playwright/test';
import { INITIAL_DEMO_SPACES, INITIAL_REGION_STATS } from '../../src/data/demoData';

test.use({ serviceWorkers:'block' });
test('ログイン中の発表モードはデモ予約のみを使う', async ({page}) => {
  let savedToServer = 0;
  const space = { ...INITIAL_DEMO_SPACES[0], name:'分離確認施設（デモ）', totalSeats:31, availableSeats:31 };
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({json:{authenticated:true,user:{sub:'test',displayName:'Test',isAdmin:false}}});
    if (path === '/api/spaces') return route.fulfill({json:{spaces:[space]}});
    if (path === '/api/disparity') return route.fulfill({json:{regions:INITIAL_REGION_STATS}});
    if (path === '/api/favorites') return route.fulfill({json:{favoriteIds:[]}});
    if (path === '/api/reservations' && route.request().method() === 'GET') return route.fulfill({json:{reservations:[]}});
    if (path === '/api/reservations') { savedToServer++; return route.fulfill({json:{ok:true,id:'res-wrong'}}); }
    return route.fulfill({status:404,json:{}});
  });
  await page.goto('/demo');
  for (let i=0; i<3; i++) await page.getByRole('button',{name:/次へ/}).click();
  await page.getByRole('heading',{name:space.name}).first().click();
  await expect(page.getByRole('button',{name:'予約を確定する',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'デモ予約を確定（発表用）'}).click();
  await expect(page.getByText('予約を登録しました（プロトタイプ）')).toBeVisible();
  expect(savedToServer).toBe(0);
  await page.getByRole('button',{name:'閉じる'}).click();
  await page.getByRole('button',{name:/初期化/}).click();
  await expect(page.getByRole('button',{name:'前へ'})).toBeDisabled();
  await page.getByRole('button',{name:/次へ/}).click();
  await expect(page.getByRole('button',{name:'前へ'})).toBeEnabled();
  await expect(page.getByText('31席').first()).toBeVisible();
});
