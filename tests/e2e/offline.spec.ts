import { expect, test } from '@playwright/test';

test('一度読み込んだ発表モードは通信断でも再表示できる', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Service Worker caching is checked in Chromium.');
  await page.goto('/demo');
  await expect(page.getByText('STEP 1：課題発見')).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect(page.getByText('STEP 1：課題発見')).toBeVisible();
  await context.setOffline(true);
  try {
    await page.goto('/demo');
    await expect(page.getByText('STEP 1：課題発見')).toBeVisible();
    await page.getByRole('button', { name: /次へ/ }).click();
    await expect(page.getByText('STEP 2：理想の学習環境')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('Service Worker導入後もAPI要求はネットワークへ届く', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  const result = await page.evaluate(async () => (await fetch('/api/health')).status);
  expect(result).toBe(200);
});
