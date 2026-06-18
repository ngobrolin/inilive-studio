import { expect, test, type Page } from "@playwright/test";
import { enterHostBackstage, setupProductRoom } from "$lib/testing/playwright/product-room";

test("Host can send a Room Chat message from Backstage", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "room-chat-host@example.com",
    title: "Room chat host episode",
  });

  await enterHostBackstage(page, room.roomHref, "Host One");
  await page.getByLabel("Room Chat message").fill("Hello Room");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("Host One").first()).toBeVisible();
  await expect(page.getByText("Hello Room")).toBeVisible();
});

test("Host and Guest can send plain-text Room Chat messages", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "room-chat-multi@example.com",
    title: "Room chat multi episode",
  });

  await enterHostBackstage(page, room.roomHref, "Host One");
  await sendRoomChatMessage(page, "Welcome Guest");

  await page.goto(room.guestJoinUrl);
  await page.getByLabel("Display Name").fill("Guest One");
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);
  await sendRoomChatMessage(page, "<strong>Plain text only</strong>");

  await expect(page.getByText("Host One · Host")).toBeVisible();
  await expect(page.getByText("Welcome Guest")).toBeVisible();
  await expect(page.getByText("Guest One · Guest")).toBeVisible();
  await expect(page.getByText("<strong>Plain text only</strong>")).toBeVisible();
  await expect(page.getByTestId("room-chat-messages").locator("strong")).toHaveCount(0);
});

async function sendRoomChatMessage(page: Page, message: string) {
  await page.getByLabel("Room Chat message").fill(message);
  await page.getByRole("button", { name: "Send message" }).click();
}
