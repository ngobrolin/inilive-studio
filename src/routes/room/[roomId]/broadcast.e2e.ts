import { expect, test, type Page } from "@playwright/test";

test("Host can enter YouTube credentials and start Broadcasting", async ({ page }) => {
  const roomId = `broadcast-start-${Date.now()}`;

  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");

  await page.goto(hostUrl);
  await expect(page.getByTestId("broadcast-controls")).toBeVisible();
  await expect(page.getByText("the YouTube archive is the recording")).toBeVisible();
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  await page.getByRole("button", { name: "Start Broadcast" }).click();

  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcasting");
  await expect(page.getByTestId("broadcast-health")).toContainText("Connecting");
  await expect(page.getByTestId("broadcast-health")).toContainText(
    "Broadcast Bridge is connecting",
  );
  await expect(page.getByTestId("broadcast-preview")).toContainText("Live");
  await expect(page.getByLabel("Stream key")).toHaveCount(0);
});

test("Host can end a Broadcast and return to the Ended state", async ({ page }) => {
  const roomId = `broadcast-end-${Date.now()}`;

  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");

  await page.goto(hostUrl);
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  await page.getByRole("button", { name: "Start Broadcast" }).click();
  await page.getByRole("button", { name: "End Broadcast" }).click();

  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcast ended");
  await expect(page.getByTestId("broadcast-preview")).toContainText("Not live");
  await expect(page.getByLabel("Stream key")).toBeVisible();
});

test("Host Broadcast Health updates from bridge callback polling", async ({ page }) => {
  const roomId = `broadcast-health-${Date.now()}`;

  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");

  await page.goto(hostUrl);
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  await page.getByRole("button", { name: "Start Broadcast" }).click();
  await page.route(`**/room/${roomId}/broadcast-state?**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        state: "broadcasting",
        failureMessage: null,
        health: {
          status: "degraded",
          message: "RTMP output is degraded.",
          updatedAt: Date.now(),
        },
      }),
    });
  });

  await expect(page.getByTestId("broadcast-health")).toContainText("Degraded", {
    timeout: 5000,
  });
  await expect(page.getByTestId("broadcast-health")).toContainText("RTMP output is degraded.");
});

test("Guest sees Broadcast State but not Host credential controls", async ({ page }) => {
  const roomId = `broadcast-guest-${Date.now()}`;

  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");
  const guestUrl = await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One");

  await page.goto(hostUrl);
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  await page.getByRole("button", { name: "Start Broadcast" }).click();

  await page.goto(guestUrl);
  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcasting");
  await expect(page.getByTestId("broadcast-health")).toHaveCount(0);
  await expect(page.getByTestId("broadcast-preview")).toContainText("Live");
  await expect(page.getByTestId("broadcast-controls")).toHaveCount(0);
  await expect(page.getByLabel("Stream key")).toHaveCount(0);
});

test("Host sees Failed when the bridge reports a Broadcast failure", async ({ page }) => {
  const roomId = `broadcast-failed-${Date.now()}`;

  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");

  await page.goto(hostUrl);
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  await page.getByRole("button", { name: "Start Broadcast" }).click();
  await page.getByRole("button", { name: "Simulate bridge failure" }).click();

  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcast failed");
  await expect(page.getByTestId("broadcast-health")).toContainText("Failed");
  await expect(page.getByTestId("broadcast-state")).toContainText(
    "YouTube rejected the stream credentials.",
  );
  await expect(page.getByLabel("Stream key")).toBeVisible();
});

test("Host sends the Composed Room Feed to the authenticated WHIP ingest endpoint", async ({
  page,
}) => {
  const roomId = `broadcast-whip-${Date.now()}`;

  const hostUrl = await enterRoom(page, `/room/${roomId}/join`, "Host One");

  await page.goto(hostUrl);
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  const whipRequest = page.waitForRequest((request) => {
    return request.method() === "POST" && request.url().endsWith(`/whip/${roomId}`);
  });
  await page.getByRole("button", { name: "Start Broadcast" }).click();

  const request = await whipRequest;
  expect(request.headers().authorization).toMatch(/^Bearer whip_/);
  expect(request.headers()["content-type"]).toContain("application/sdp");
  expect(request.postData() ?? "").toContain("v=0");
  await expect(page.getByTestId("whip-ingest-status")).toContainText("WHIP ingest connected");
});

async function enterRoom(page: Page, url: string, name: string) {
  await page.goto(url);
  await page.getByLabel("Display Name").fill(name);
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);
  return page.url();
}
