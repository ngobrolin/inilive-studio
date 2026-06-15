import { expect, test, type Page } from "@playwright/test";

test("Host and three Guests are represented in Backstage presence", async ({ page }) => {
  const roomId = `presence-${Date.now()}`;

  await enterRoom(page, `/room/${roomId}/join`, "Host One");
  await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One");
  await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest Two");

  await page.goto(`/room/${roomId}/invite/demo/join`);
  await page.getByRole("button", { name: "Turn camera off" }).click();
  await page.getByLabel("Display Name").fill("Guest Three");
  await page.getByRole("button", { name: "Enter Room" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Room presence");
  await expect(page.getByText("1 Host · 3/3 Guests")).toBeVisible();
  await expect(page.getByText("Host One").first()).toBeVisible();
  await expect(page.getByText("Guest One").first()).toBeVisible();
  await expect(page.getByText("Guest Two").first()).toBeVisible();
  await expect(page.getByText("Guest Three").first()).toBeVisible();
  await expect(page.getByTestId("camera-off-placeholder")).toContainText("Guest Three");
});

test("a fourth Guest sees Room Full", async ({ page }) => {
  const roomId = `full-${Date.now()}`;

  await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One");
  await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest Two");
  await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest Three");
  await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest Four");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Room Full");
  await expect(page.getByText(/already has three Guests/i)).toBeVisible();
});

async function enterRoom(page: Page, url: string, name: string) {
  await page.goto(url);
  await page.getByLabel("Display Name").fill(name);
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage|\/full/);
}
