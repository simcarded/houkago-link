import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });

test.describe('放課後Link E2Eフロー', () => {
  test('ホーム表示・検索遷移・施設詳細表示が動作する', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('放課後の学習スペースを探す')).toBeVisible();

    await page.getByRole('button', { name: 'マップから探す' }).click();
    await expect(page).toHaveURL(/\/explore/);
    const mapToggle = page.getByRole('button', { name: 'マップ', exact: true });
    if ((page.viewportSize()?.width ?? 1024) < 1024) await mapToggle.click();
    await expect(page.getByText('愛知県内 学習スペースマップ')).toBeVisible();
  });

  test('利用者向けナビはホーム・予約・マイページに絞られている', async ({ page }) => {
    await page.goto('/');
    for (const name of ['ホーム', '予約する', 'マイページ']) {
      await expect(page.getByRole('button', { name, exact: true }).first()).toBeVisible();
    }
    for (const name of ['地域格差', '施設提供', '発表モード']) {
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    }
  });

  test('予約画面は空の施設一覧を正しく案内する', async ({ page }) => {
    await page.route('**/api/spaces', (route) => route.fulfill({ json: { spaces: [] } }));
    await page.goto('/explore');
    await expect(page.getByText(/現在、予約可能な施設情報はありません/)).toBeVisible();
  });

  test('施設マップの選択地点からGoogleマップ経路を開ける', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill({ json: { authenticated: false, user: null } }));
    const facility = { id:'map-1', name:'栄の学習室', providerType:'public', regionId:'sakae', regionName:'栄', address:'名古屋市中区', lat:35.17, lng:136.9, feeYen:0, openTime:'15:00', closeTime:'20:00', totalSeats:8, availableSeats:4, wifi:true, outlets:true, quiet:true, soloOk:true, groupOk:false, barrierFree:false, rules:[], notes:'', isPublished:true, isDemo:false };
    await page.route('**/api/spaces', (route) => route.fulfill({ json: { spaces: [facility] } }));
    await page.goto('/explore');
    await page.getByText('栄の学習室').first().waitFor();
    const route = page.locator('[data-testid="selected-facility-route"] a');
    await expect(route).toHaveAttribute('href', /google\.com\/maps\/dir/);
    await expect(route).toHaveAttribute('href', /destination=35\.17,136\.9/);
  });
});






