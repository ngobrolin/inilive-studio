import { expect, type APIRequestContext, type Page } from "@playwright/test";

export type ProductRoomFixtures = {
  roomId: string;
  roomHref: string;
  inviteLink: string;
  guestJoinUrl: string;
};

export async function signInHost(page: Page, request: APIRequestContext, email: string) {
  const loginResponse = await request.post("/auth/login", {
    data: { email },
  });
  expect(loginResponse.status()).toBe(202);

  const latestTokenResponse = await request.get(
    `/auth/dev/latest-token?email=${encodeURIComponent(email)}`,
  );
  const latestTokenBody = (await latestTokenResponse.json()) as { token: string | null };
  expect(latestTokenBody.token).toMatch(/^[\w-]+$/);

  await page.goto("about:blank");
  await page.goto(`/auth/verify#${latestTokenBody.token}`);
  await expect(page).toHaveURL("/dashboard");
}

export async function createProductRoom(page: Page, title: string): Promise<ProductRoomFixtures> {
  await page.getByLabel("Room Title").fill(title);
  await page.getByRole("button", { name: "Create Room" }).click();
  const roomLink = page.getByRole("link", { name: new RegExp(title) });
  await expect(roomLink).toBeVisible();

  const roomHref = await roomLink.getAttribute("href");
  expect(roomHref).toMatch(/^\/room\//);

  const roomId = roomHref!.replace(/^\/room\//, "");
  const inviteLink = await page.getByLabel(`Guest Invite link for ${title}`).inputValue();

  return {
    roomId,
    roomHref: roomHref!,
    inviteLink,
    guestJoinUrl: `${inviteLink}/join`,
  };
}

export async function setupProductRoom(
  page: Page,
  request: APIRequestContext,
  input: { email: string; title: string },
): Promise<ProductRoomFixtures> {
  await signInHost(page, request, input.email);
  return createProductRoom(page, input.title);
}

export async function enterHostBackstage(
  page: Page,
  roomHref: string,
  displayName: string,
  options: { cameraOff?: boolean } = {},
): Promise<string> {
  await page.goto(`${roomHref}/join`);
  if (options.cameraOff) {
    await page.getByRole("button", { name: "Turn camera off" }).click();
  }
  await page.getByLabel("Display Name").fill(displayName);
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);
  return page.url();
}

export async function enterGuestBackstage(
  page: Page,
  guestJoinUrl: string,
  displayName: string,
  options: { cameraOff?: boolean } = {},
): Promise<string> {
  await page.goto(guestJoinUrl);
  if (options.cameraOff) {
    await page.getByRole("button", { name: "Turn camera off" }).click();
  }
  await page.getByLabel("Display Name").fill(displayName);
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage|\/full/);
  return page.url();
}

export async function startProductBroadcast(page: Page) {
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  await page.getByRole("button", { name: "Start Broadcast Countdown" }).click();
  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcasting", {
    timeout: 10_000,
  });
}
