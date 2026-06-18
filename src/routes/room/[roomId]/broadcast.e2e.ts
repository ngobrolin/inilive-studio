import { expect, test } from "@playwright/test";
import {
  enterGuestBackstage,
  enterHostBackstage,
  setupProductRoom,
  startProductBroadcast,
} from "$lib/testing/playwright/product-room";

test("Host can enter YouTube credentials and start Broadcasting", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "broadcast-start@example.com",
    title: "Broadcast start episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");

  await page.goto(hostUrl);
  await expect(page.getByTestId("broadcast-controls")).toBeVisible();
  await expect(page.getByText("the YouTube archive is the recording")).toBeVisible();
  await startProductBroadcast(page);

  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcasting");
  await expect(page.getByTestId("broadcast-health")).toContainText("Connecting");
  await expect(page.getByTestId("broadcast-health")).toContainText(
    "Broadcast Bridge is connecting",
  );
  await expect(page.getByTestId("broadcast-preview")).toContainText("Live");
  await expect(page.getByLabel("Stream key")).toHaveCount(0);
});

test("Host can end a Broadcast and return to the Ended state", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "broadcast-end@example.com",
    title: "Broadcast end episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");

  await page.goto(hostUrl);
  await startProductBroadcast(page);
  await page.getByRole("button", { name: "End Broadcast" }).click();

  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcast ended");
  await expect(page.getByTestId("broadcast-preview")).toContainText("Not live");
  await expect(page.getByLabel("Stream key")).toBeVisible();
});

test("Host Broadcast Health updates from bridge callback polling", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "broadcast-health@example.com",
    title: "Broadcast health episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");

  await page.goto(hostUrl);
  await startProductBroadcast(page);
  await page.route(`**/room/${room.roomId}/broadcast-state?**`, async (route) => {
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

test("Guest sees Broadcast State but not Host credential controls", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "broadcast-guest-view@example.com",
    title: "Broadcast guest view episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");
  const guestUrl = await enterGuestBackstage(page, room.guestJoinUrl, "Guest One");

  await page.goto(hostUrl);
  await startProductBroadcast(page);

  await page.goto(guestUrl);
  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcasting");
  await expect(page.getByTestId("broadcast-health")).toHaveCount(0);
  await expect(page.getByTestId("broadcast-preview")).toContainText("Live");
  await expect(page.getByTestId("broadcast-controls")).toHaveCount(0);
  await expect(page.getByLabel("Stream key")).toHaveCount(0);
});

test("Host sees Failed when the bridge reports a Broadcast failure", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "broadcast-failed@example.com",
    title: "Broadcast failed episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");

  await page.goto(hostUrl);
  await startProductBroadcast(page);
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
  request,
}) => {
  const room = await setupProductRoom(page, request, {
    email: "broadcast-whip@example.com",
    title: "Broadcast whip episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");

  await page.goto(hostUrl);
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  const whipRequest = page.waitForRequest((request) => {
    return request.method() === "POST" && request.url().endsWith(`/whip/${room.roomId}`);
  });
  await page.getByRole("button", { name: "Start Broadcast Countdown" }).click();

  const requestInfo = await whipRequest;
  expect(requestInfo.headers().authorization).toMatch(/^Bearer whip_/);
  expect(requestInfo.headers()["content-type"]).toContain("application/sdp");
  expect(requestInfo.postData() ?? "").toContain("v=0");
  await expect(page.getByTestId("whip-ingest-status")).toContainText("WHIP ingest connected");
});
