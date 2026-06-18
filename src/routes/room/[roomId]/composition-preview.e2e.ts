import { expect, test } from "@playwright/test";
import {
  enterGuestBackstage,
  enterHostBackstage,
  setupProductRoom,
} from "$lib/testing/playwright/product-room";

test("Backstage shows a participant grid and not-live Broadcast Preview", async ({
  page,
  request,
}) => {
  const room = await setupProductRoom(page, request, {
    email: "composition-grid@example.com",
    title: "Composition grid episode",
  });

  await enterHostBackstage(page, room.roomHref, "Host One");
  await enterGuestBackstage(page, room.guestJoinUrl, "Guest One", { cameraOff: true });

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

test("Guest Backstage view also includes the Broadcast Preview", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "composition-guest-preview@example.com",
    title: "Guest preview episode",
  });

  await enterHostBackstage(page, room.roomHref, "Host One");
  await enterGuestBackstage(page, room.guestJoinUrl, "Guest One");

  await expect(page.getByTestId("broadcast-preview")).toContainText("Backstage preview");
  await expect(page.getByTestId("broadcast-preview")).toContainText("Not live");
});

test("Composed Room Feed renders a 720p captureStream canvas", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "composition-canvas@example.com",
    title: "Canvas composition episode",
  });

  await enterHostBackstage(page, room.roomHref, "Host One");
  await enterGuestBackstage(page, room.guestJoinUrl, "Guest One", { cameraOff: true });

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

test("Composed Room Feed captureStream exposes a playable 720p video track", async ({
  page,
  request,
}) => {
  const room = await setupProductRoom(page, request, {
    email: "composition-stream-track@example.com",
    title: "Stream track episode",
  });

  await enterHostBackstage(page, room.roomHref, "Host One");

  const trackInfo = await page.evaluate(async () => {
    const canvas = document.querySelector(
      '[data-testid="composition-canvas"]',
    ) as HTMLCanvasElement | null;
    if (!canvas) {
      return null;
    }

    const stream = canvas.captureStream(30);
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      return null;
    }

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    return {
      readyState: videoTrack.readyState,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  });

  expect(trackInfo).not.toBeNull();
  expect(trackInfo?.readyState).toBe("live");
  expect(trackInfo?.width).toBe(1280);
  expect(trackInfo?.height).toBe(720);
});

test("Composed Room Feed makes Screen Share the primary source", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "composition-screen-share@example.com",
    title: "Screen share composition episode",
  });

  await enterHostBackstage(page, room.roomHref, "Host One");
  await page.getByRole("button", { name: "Start Screen Share" }).click();

  await expect(page.getByTestId("composition-primary-source")).toContainText("Screen Share");
  await expect(page.getByTestId("capture-stream-status")).toContainText(
    "Composed feed stream ready",
  );
});
