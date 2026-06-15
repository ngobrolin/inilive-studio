import { expect, test, type Page } from "@playwright/test";

test("Host can start and stop Screen Share state", async ({ page }) => {
  const roomId = `screen-share-${Date.now()}`;
  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");

  await expect(page.getByTestId("screen-share-status")).toContainText(
    "No Screen Share is active.",
  );
  await page.getByRole("button", { name: "Start Screen Share" }).click();
  await expect(page.getByTestId("screen-share-status")).toContainText(
    "Host One is sharing their screen.",
  );
  await page.getByRole("button", { name: "Stop Screen Share" }).click();
  await expect(page.getByTestId("screen-share-status")).toContainText(
    "No Screen Share is active.",
  );

  await page.goto(hostUrl);
  await expect(page.getByRole("button", { name: "Start Screen Share" })).toBeVisible();
});

test("Guests can see active Screen Share state but cannot start Screen Share", async ({ page }) => {
  const roomId = `guest-screen-share-${Date.now()}`;
  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");
  const guestUrl = await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One");

  await page.goto(hostUrl);
  await page.getByRole("button", { name: "Start Screen Share" }).click();

  await page.goto(guestUrl);
  await expect(page.getByTestId("screen-share-status")).toContainText(
    "Host One is sharing their screen.",
  );
  await expect(page.getByRole("button", { name: "Start Screen Share" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop Screen Share" })).toHaveCount(0);
});

async function enterRoom(page: Page, url: string, name: string) {
  await page.goto(url);
  await page.getByLabel("Display Name").fill(name);
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);
  return page.url();
}
