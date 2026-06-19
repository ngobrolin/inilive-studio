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

  const hasBackstageChromeBurnedIntoOutput = await canvas.evaluate((element) => {
    const output = element as HTMLCanvasElement;
    const context = output.getContext("2d");
    if (!context) {
      throw new Error("composition canvas context is unavailable");
    }

    const pixels = context.getImageData(0, 0, output.width, 48).data;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      if (red > 180 && green > 140 && blue < 160) {
        return true;
      }
    }
    return false;
  });
  expect(hasBackstageChromeBurnedIntoOutput).toBe(false);
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

test("Composed Room Feed draws a live camera source into the canvas", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "composition-live-camera@example.com",
    title: "Live camera composition episode",
  });

  const backstageUrl = await enterHostBackstage(page, room.roomHref, "Host One");
  const participantId = new URL(backstageUrl).searchParams.get("participant");
  if (!participantId) {
    throw new Error("expected a participant id in the backstage URL");
  }

  await expect(page.getByTestId("capture-stream-status")).toContainText(
    "Composed feed stream ready",
  );

  // Inject a synthetic, continuously repainting magenta camera source into the
  // shared media registry under the host's identity. In hermetic stub mode there
  // is no real LiveKit track, so this proves the compositor draws a registered
  // camera video element into the composed canvas with drawImage().
  await page.evaluate(async (identity) => {
    const registry = (
      window as unknown as {
        __iniliveRoomMediaRegistry?: {
          registerVideoSource: (
            id: string,
            kind: "camera" | "screen",
            element: HTMLVideoElement,
          ) => () => void;
        };
      }
    ).__iniliveRoomMediaRegistry;
    if (!registry) {
      throw new Error("media registry hook is not available");
    }

    const source = document.createElement("canvas");
    source.width = 320;
    source.height = 180;
    const sourceContext = source.getContext("2d")!;
    const paint = () => {
      sourceContext.fillStyle = "rgb(255, 0, 255)";
      sourceContext.fillRect(0, 0, source.width, source.height);
      requestAnimationFrame(paint);
    };
    paint();

    const stream = source.captureStream(30);
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    // Keep references alive so the synthetic source is not garbage collected.
    (
      window as unknown as { __iniliveTestCameraVideo?: HTMLVideoElement }
    ).__iniliveTestCameraVideo = video;
    registry.registerVideoSource(identity, "camera", video);
  }, participantId);

  // Magenta camera pixels at the center of the host tile, not the neutral
  // "Camera on" placeholder fill (#164e63).
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const canvas = document.querySelector(
            '[data-testid="composition-canvas"]',
          ) as HTMLCanvasElement | null;
          const context = canvas?.getContext("2d");
          if (!context) {
            return false;
          }
          const [r, g, b] = context.getImageData(640, 360, 1, 1).data;
          return r > 200 && g < 90 && b > 200;
        }),
      { timeout: 10_000 },
    )
    .toBe(true);
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
