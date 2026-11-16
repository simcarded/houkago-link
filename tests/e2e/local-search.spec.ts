import { expect, test } from '@playwright/test';

test('条件検索はAI APIに送信せず端末内で絞り込む', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/ai/**', async route => { calls++; await route.abort(); });
  await page.goto('/explore');
  await page.getByPlaceholder('希望を自然に入力', { exact:false }).fill('無料で静かなWi-Fi');
  await page.getByRole('button', { name:'条件を読み取って検索' }).click();
  await expect(page.getByText('端末内の条件検索（AI未使用）')).toBeVisible();
  await page.getByRole('button', { name:'詳細条件' }).click();
  await expect(page.getByRole('checkbox', { name:'Wi-Fi' })).toBeChecked();
  expect(calls).toBe(0);
});
