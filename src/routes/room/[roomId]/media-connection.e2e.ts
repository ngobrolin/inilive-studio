import { expect, test } from "@playwright/test";
import { enterHostBackstage, setupProductRoom } from "$lib/testing/playwright/product-room";

test("Host sees media connection status in Backstage after joining", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "media-connection@example.com",
    title: "Media connection episode",
  });

  await enterHostBackstage(page, room.roomHref, "Host One");

  await expect(page.getByTestId("media-connection-status")).toContainText("Local preview only");
  await expect(page.getByTestId("media-connection-status")).toContainText("LiveKit");
});

test("Host sees a local media preview in Backstage", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "media-preview@example.com",
    title: "Media preview episode",
  });

  await enterHostBackstage(page, room.roomHref, "Host One");

  await expect(page.getByTestId("local-media-preview")).toBeVisible();
});
