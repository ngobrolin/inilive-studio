import { expect, test } from "@playwright/test";
import { setupProductRoom } from "$lib/testing/playwright/product-room";

test("authless Host prototype Room URLs redirect to sign in", async ({ page }) => {
  await page.goto("/room/demo");
  await expect(page).toHaveURL("/login");

  await page.goto("/room/demo/join");
  await expect(page).toHaveURL("/login");
});

test("legacy demo Guest Invites are unavailable", async ({ page }) => {
  await page.goto("/room/demo/invite/demo");
  await expect(page.getByRole("heading", { name: "Guest Invite unavailable" })).toBeVisible();

  await page.goto("/room/demo/invite/demo/join");
  await expect(page.getByRole("heading", { name: "Guest Invite unavailable" })).toBeVisible();
});

test("throwaway prototype entry route is removed", async ({ page }) => {
  const response = await page.goto("/prototype/room-entry");
  expect(response?.status()).toBe(404);
});

test("valid product Guest Invites still work after cleanup", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "cleanup-guest-invite@example.com",
    title: "Cleanup invite episode",
  });

  await page.context().clearCookies();
  await page.goto(room.inviteLink);

  await expect(page.getByRole("heading", { level: 2 })).toContainText(
    "Join the Room without creating an Account",
  );
  await expect(page.getByRole("link", { name: "Guest", exact: true })).toHaveAttribute(
    "data-active",
    "true",
  );
});
