import { expect, test } from "@playwright/test";
import {
  enterGuestBackstage,
  enterHostBackstage,
  setupProductRoom,
} from "$lib/testing/playwright/product-room";

test("Host and three Guests are represented in Backstage presence", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "presence-host-guests@example.com",
    title: "Presence episode",
  });

  await enterHostBackstage(page, room.roomHref, "Host One");
  await enterGuestBackstage(page, room.guestJoinUrl, "Guest One");
  await enterGuestBackstage(page, room.guestJoinUrl, "Guest Two");

  await page.goto(room.guestJoinUrl);
  await page.getByRole("button", { name: "Turn camera off" }).click();
  await page.getByLabel("Display Name").fill("Guest Three");
  await page.getByRole("button", { name: "Enter Room" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Backstage");
  await expect(page.getByRole("complementary").getByText("1 Host · 3/3 Guests")).toBeVisible();
  await expect(page.getByText("Host One").first()).toBeVisible();
  await expect(page.getByText("Guest One").first()).toBeVisible();
  await expect(page.getByText("Guest Two").first()).toBeVisible();
  await expect(page.getByText("Guest Three").first()).toBeVisible();
  await expect(page.getByTestId("camera-off-placeholder")).toContainText("Guest Three");
});

test("a fourth Guest sees Room Full", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "presence-room-full@example.com",
    title: "Room full episode",
  });

  await page.context().clearCookies();
  await enterGuestBackstage(page, room.guestJoinUrl, "Guest One");
  await enterGuestBackstage(page, room.guestJoinUrl, "Guest Two");
  await enterGuestBackstage(page, room.guestJoinUrl, "Guest Three");
  await enterGuestBackstage(page, room.guestJoinUrl, "Guest Four");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Room Full");
  await expect(page.getByText(/already has three Guests/i)).toBeVisible();
});
