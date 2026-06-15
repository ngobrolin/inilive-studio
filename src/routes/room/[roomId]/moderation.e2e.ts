import { expect, test, type Page } from "@playwright/test";

test("Host can force-mute and force-camera-off a Guest", async ({ page }) => {
  const roomId = `moderation-${Date.now()}`;

  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");
  const guestUrl = await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One");

  await page.goto(hostUrl);
  await page.getByRole("button", { name: "Force mute Guest One" }).click();
  await page.getByRole("button", { name: "Force camera off Guest One" }).click();
  await expect(page.getByText("Host-muted")).toBeVisible();
  await expect(page.getByTestId("camera-off-placeholder")).toContainText("Guest One");

  await page.goto(guestUrl);
  await expect(page.getByText("The Host muted your microphone")).toBeVisible();
  await expect(page.getByText("The Host turned your camera off")).toBeVisible();
});

test("Host can request unmute and the Guest can accept", async ({ page }) => {
  const roomId = `request-unmute-${Date.now()}`;

  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");
  const guestUrl = await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One");

  await page.goto(hostUrl);
  await page.getByRole("button", { name: "Request unmute from Guest One" }).click();

  await page.goto(guestUrl);
  await expect(page.getByText("The Host requested that you unmute your microphone")).toBeVisible();
  await page.getByRole("button", { name: "Accept unmute request" }).click();
  await expect(page.getByText("The Host requested that you unmute your microphone")).toHaveCount(0);

  await page.goto(hostUrl);
  await expect(page.getByText("Mic on").nth(1)).toBeVisible();
});

test("Host can remove a Guest from the current Room session", async ({ page }) => {
  const roomId = `remove-guest-${Date.now()}`;

  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");
  const guestUrl = await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One");

  await page.goto(hostUrl);
  await page.getByRole("button", { name: "Remove Guest One" }).click();
  await expect(page.getByText("Guest One")).toHaveCount(0);

  await page.goto(guestUrl);
  await expect(page.getByText("Removed from Room")).toBeVisible();
  await expect(page.getByText("does not revoke the Guest Invite")).toBeVisible();
});

async function enterRoom(page: Page, url: string, name: string) {
  await page.goto(url);
  await page.getByLabel("Display Name").fill(name);
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);
  return page.url();
}
