import { expect, test, type Page } from "@playwright/test";

test("Host can send a Room Chat message from Backstage", async ({ page }) => {
  const roomId = `chat-${Date.now()}`;

  await enterRoom(page, `/room/${roomId}/join`, "Host One");
  await page.getByLabel("Room Chat message").fill("Hello Room");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("Host One").first()).toBeVisible();
  await expect(page.getByText("Hello Room")).toBeVisible();
});

test("Host and Guest can send plain-text Room Chat messages", async ({ page }) => {
  const roomId = `chat-multi-${Date.now()}`;

  await enterRoom(page, `/room/${roomId}/join`, "Host One");
  await sendRoomChatMessage(page, "Welcome Guest");

  await enterRoom(page, `/room/${roomId}/invite/demo/join`, "Guest One");
  await sendRoomChatMessage(page, "<strong>Plain text only</strong>");

  await expect(page.getByText("Host One · Host")).toBeVisible();
  await expect(page.getByText("Welcome Guest")).toBeVisible();
  await expect(page.getByText("Guest One · Guest")).toBeVisible();
  await expect(page.getByText("<strong>Plain text only</strong>")).toBeVisible();
  await expect(page.getByTestId("room-chat-messages").locator("strong")).toHaveCount(0);
});

async function enterRoom(page: Page, url: string, name: string) {
  await page.goto(url);
  await page.getByLabel("Display Name").fill(name);
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);
}

async function sendRoomChatMessage(page: Page, message: string) {
  await page.getByLabel("Room Chat message").fill(message);
  await page.getByRole("button", { name: "Send message" }).click();
}
