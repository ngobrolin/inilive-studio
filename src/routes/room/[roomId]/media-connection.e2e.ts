import { expect, test, type Page } from "@playwright/test";

test("Host sees media connection status in Backstage after joining", async ({ page }) => {
  const roomId = `media-${Date.now()}`;

  await enterRoom(page, `/room/${roomId}/join`, "Host One");

  await expect(page.getByTestId("media-connection-status")).toContainText("Local preview only");
  await expect(page.getByTestId("media-connection-status")).toContainText("LiveKit");
});

test("Host sees a local media preview in Backstage", async ({ page }) => {
  const roomId = `media-preview-${Date.now()}`;

  await enterRoom(page, `/room/${roomId}/join`, "Host One");

  await expect(page.getByTestId("local-media-preview")).toBeVisible();
});

async function enterRoom(page: Page, url: string, name: string) {
  await page.goto(url);
  await page.getByLabel("Display Name").fill(name);
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);
}
