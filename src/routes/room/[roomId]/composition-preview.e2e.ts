import { expect, test, type Page } from "@playwright/test";

test("Backstage shows a participant grid and not-live Broadcast Preview", async ({ page }) => {
  const roomId = `composition-${Date.now()}`;

  await enterRoom(page, `/room/${roomId}/join`, "Host One");
  await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One", {
    cameraOff: true,
  });

  await expect(page.getByRole("heading", { name: "Participant grid" })).toBeVisible();
  await expect(page.getByTestId("participant-grid")).toContainText("Host One");
  await expect(page.getByTestId("participant-grid")).toContainText("Guest One");
  await expect(
    page.getByTestId("participant-grid").getByTestId("camera-off-placeholder"),
  ).toContainText("Guest One");

  await expect(page.getByRole("heading", { name: "Broadcast Preview" })).toBeVisible();
  await expect(page.getByTestId("broadcast-preview")).toContainText("Backstage preview");
  await expect(page.getByTestId("broadcast-preview")).toContainText("Not live");
  await expect(page.getByTestId("broadcast-preview")).toContainText("Host One");
  await expect(page.getByTestId("broadcast-preview")).toContainText("Guest One");
});

test("Guest Backstage view also includes the Broadcast Preview", async ({ page }) => {
  const roomId = `guest-composition-${Date.now()}`;

  await enterRoom(page, `/room/${roomId}/join`, "Host One");
  await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One");

  await expect(page.getByTestId("broadcast-preview")).toContainText("Backstage preview");
  await expect(page.getByTestId("broadcast-preview")).toContainText("Not live");
});

test("Composed Room Feed renders a 720p captureStream canvas", async ({ page }) => {
  const roomId = `canvas-composition-${Date.now()}`;

  await enterRoom(page, `/room/${roomId}/join`, "Host One");
  await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One", {
    cameraOff: true,
  });

  const canvas = page.getByTestId("composition-canvas");
  await expect(page.getByRole("heading", { name: "Canvas output" })).toBeVisible();
  await expect(page.getByTestId("capture-stream-status")).toContainText(
    "Composed feed stream ready",
  );
  await expect(page.getByTestId("composition-primary-source")).toContainText("Participant grid");
  await expect(canvas).toHaveJSProperty("width", 1280);
  await expect(canvas).toHaveJSProperty("height", 720);

  await expect
    .poll(async () => Number(await page.getByTestId("composition-fps").textContent()))
    .toBeGreaterThanOrEqual(28);
});

test("Composed Room Feed makes Screen Share the primary source", async ({ page }) => {
  const roomId = `screen-composition-${Date.now()}`;

  await enterRoom(page, `/room/${roomId}/join`, "Host One");
  await page.getByRole("button", { name: "Start Screen Share" }).click();

  await expect(page.getByTestId("composition-primary-source")).toContainText("Screen Share");
  await expect(page.getByTestId("capture-stream-status")).toContainText(
    "Composed feed stream ready",
  );
});

async function enterRoom(
  page: Page,
  url: string,
  name: string,
  options: { cameraOff?: boolean } = {},
) {
  await page.goto(url);
  if (options.cameraOff) {
    await page.getByRole("button", { name: "Turn camera off" }).click();
  }
  await page.getByLabel("Display Name").fill(name);
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);
  return page.url();
}
