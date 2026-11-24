import { expect, test } from "@playwright/test";
test("発表モードURLは利用者サイトから外れている", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText("放課後の学習スペースを探す")).toBeVisible();
});
