import { expect, test } from '@playwright/test';

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

  test('地域格差マップと施設提供シミュレーションが連動する', async ({ page }) => {
    await page.goto('/simulation');
    await expect(page.getByText('企業・自治体の施設提供シミュレーション')).toBeVisible();

    await page.getByRole('button', { name: /知多半島：企業会議室の夜間開放/ }).click();
    await page.getByRole('button', { name: '地域格差' }).first().click();
    await expect(page.getByText(/\+28/)).toBeVisible();
  });

  test('/demo プレゼンモードで5ステップ遷移と初期化ができる', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByText('STEP 1：課題発見')).toBeVisible();

    await page.getByRole('button', { name: /次へ/ }).click();
    await expect(page.getByText('STEP 2：理想の学習環境')).toBeVisible();

    await page.getByRole('button', { name: /次へ/ }).click();
    await page.getByRole('button', { name: /次へ/ }).click();
    await expect(page.getByText('STEP 4：具体的な仕組み')).toBeVisible();

    await page.getByRole('button', { name: /初期化/ }).click();
    await expect(page.getByText('STEP 1：課題発見')).toBeVisible();
  });
});
