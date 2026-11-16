import { expect, test } from '@playwright/test';
import { INITIAL_DEMO_SPACES, INITIAL_REGION_STATS } from '../../src/data/demoData';

test.use({ serviceWorkers:'block' });
test('管理者は予約と矛盾する編集の失敗を確認し、施設情報を保存できる', async ({page}) => {
  let space = {...INITIAL_DEMO_SPACES[0]}; let reject = true;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({json:{authenticated:true,user:{sub:'admin',displayName:'管理者',isAdmin:true}}});
    if (url.pathname === '/api/spaces' && route.request().method() === 'GET') return route.fulfill({json:{spaces:[space]}});
    if (url.pathname === `/api/spaces/${space.id}` && route.request().method() === 'PATCH') {
      if (reject) return route.fulfill({status:409,json:{error:'既存の予約と矛盾します'}});
      space = {...space,...route.request().postDataJSON()}; return route.fulfill({json:{ok:true}});
    }
    if (url.pathname === '/api/disparity') return route.fulfill({json:{regions:INITIAL_REGION_STATS}});
    if (url.pathname === '/api/favorites') return route.fulfill({json:{favoriteIds:[]}});
    if (url.pathname === '/api/reservations') return route.fulfill({json:{reservations:[]}});
    return route.fulfill({status:404,json:{}});
  });
  await page.goto('/admin');
  await page.getByRole('button',{name:`${space.name}を編集`}).click();
  await page.getByLabel('座席数',{exact:true}).fill('20');
  await page.getByRole('button',{name:'施設の変更を保存'}).click();
  await expect(page.getByRole('status')).toContainText('既存の予約と矛盾');
  await expect(page.getByLabel('座席数',{exact:true})).toHaveValue('20');
  reject = false;
  await page.getByRole('button',{name:'施設の変更を保存'}).click();
  await expect(page.getByRole('status')).toContainText('更新しました');
  await expect(page.getByRole('heading',{name:'施設情報の編集'})).toHaveCount(0);
});
