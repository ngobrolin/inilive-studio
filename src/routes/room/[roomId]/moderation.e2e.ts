import { expect, test } from "@playwright/test";
import {
  enterGuestBackstage,
  enterHostBackstage,
  setupProductRoom,
} from "$lib/testing/playwright/product-room";

test("Host can force-mute and force-camera-off a Guest", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "moderation-force@example.com",
    title: "Moderation force episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");
  const guestUrl = await enterGuestBackstage(page, room.guestJoinUrl, "Guest One");

  await page.goto(hostUrl);
  await page.getByRole("button", { name: "Force mute Guest One" }).click();
  await page.getByRole("button", { name: "Force camera off Guest One" }).click();
  await expect(page.getByText("Host-muted")).toBeVisible();
  await expect(page.getByTestId("camera-off-placeholder")).toContainText("Guest One");

  await page.goto(guestUrl);
  await expect(page.getByText("The Host muted your microphone")).toBeVisible();
  await expect(page.getByText("The Host turned your camera off")).toBeVisible();
});

test("Host can request unmute and the Guest can accept", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "moderation-unmute@example.com",
    title: "Moderation unmute episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");
  const guestUrl = await enterGuestBackstage(page, room.guestJoinUrl, "Guest One");

  await page.goto(hostUrl);
  await page.getByRole("button", { name: "Request unmute from Guest One" }).click();

  await page.goto(guestUrl);
  await expect(page.getByText("The Host requested that you unmute your microphone")).toBeVisible();
  await page.getByRole("button", { name: "Accept unmute request" }).click();
  await expect(page.getByText("The Host requested that you unmute your microphone")).toHaveCount(0);

  await page.goto(hostUrl);
  await expect(page.getByText("Mic on").nth(1)).toBeVisible();
});

test("Host can remove a Guest from the current Room session", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "moderation-remove@example.com",
    title: "Moderation remove episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");
  const guestUrl = await enterGuestBackstage(page, room.guestJoinUrl, "Guest One");

  await page.goto(hostUrl);
  await page.getByRole("button", { name: "Remove Guest One" }).click();
  await expect(page.getByText("Guest One")).toHaveCount(0);

  await page.goto(guestUrl);
  await expect(page.getByText("Removed from Room")).toBeVisible();
  await expect(page.getByText("does not revoke the Guest Invite")).toBeVisible();
});
