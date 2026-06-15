import { expect, test } from "@playwright/test";

test("Host can open authless Room URL without signing in", async ({ page }) => {
  await page.goto("/room/demo");

  await expect(page.getByRole("heading", { level: 2 })).toContainText(
    "Prepare the Room before anything is Broadcasting",
  );
  await expect(page.getByText("Host Room URL", { exact: true })).toBeVisible();
  await expect(page.getByText("Backstage", { exact: true })).toBeVisible();
});
