import { expect, test, type Page } from "@playwright/test";

async function signInHost(
  page: Page,
  request: import("@playwright/test").APIRequestContext,
  email: string,
) {
  const loginResponse = await request.post("/auth/login", {
    data: { email },
  });
  expect(loginResponse.status()).toBe(202);

  const latestTokenResponse = await request.get(
    `/auth/dev/latest-token?email=${encodeURIComponent(email)}`,
  );
  const latestTokenBody = (await latestTokenResponse.json()) as { token: string | null };
  expect(latestTokenBody.token).toMatch(/^[\w-]+$/);

  await page.goto(`/auth/verify#${latestTokenBody.token}`);
  await expect(page).toHaveURL("/dashboard");
}

async function enterBackstage(page: Page, joinUrl: string, displayName: string) {
  await page.goto(joinUrl);
  await page.getByLabel("Display Name").fill(displayName);
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);
  return page.url();
}

test("product Room starts a persisted Broadcast Countdown before going live", async ({
  page,
  request,
}) => {
  await signInHost(page, request, "broadcast-countdown-host@example.com");

  await page.getByLabel("Room Title").fill("Countdown episode");
  await page.getByRole("button", { name: "Create Room" }).click();
  const hostRoomLink = page.getByRole("link", { name: /Countdown episode/ });
  await expect(hostRoomLink).toBeVisible();
  const roomHref = await hostRoomLink.getAttribute("href");
  expect(roomHref).toMatch(/^\/room\//);

  await page.goto(`${roomHref}/join`);
  const hostBackstageUrl = await enterBackstage(page, page.url(), "Host One");
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  await page.getByRole("button", { name: "Start Broadcast Countdown" }).click();

  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcast Countdown");
  await expect(page.getByTestId("broadcast-countdown")).toBeVisible();
  await expect(page.getByTestId("broadcast-countdown")).toContainText(/Going live in [1-5] second/);

  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcasting", {
    timeout: 10_000,
  });
  await expect(page.getByTestId("broadcast-preview")).toContainText("Live");
});

test("Host can cancel a product Broadcast Countdown and return to Backstage", async ({
  page,
  request,
}) => {
  await signInHost(page, request, "broadcast-cancel-countdown@example.com");

  await page.getByLabel("Room Title").fill("Cancel countdown episode");
  await page.getByRole("button", { name: "Create Room" }).click();
  const roomHref = await page.getByRole("link", { name: /Cancel countdown episode/ }).getAttribute("href");
  expect(roomHref).toMatch(/^\/room\//);

  await enterBackstage(page, `${roomHref}/join`, "Host One");
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  await page.getByRole("button", { name: "Start Broadcast Countdown" }).click();

  await expect(page.getByTestId("broadcast-countdown")).toBeVisible();
  await page.getByRole("button", { name: "Cancel Countdown" }).click();

  await expect(page.getByTestId("broadcast-state")).toContainText("Backstage");
  await expect(page.getByTestId("broadcast-countdown")).toHaveCount(0);
  await expect(page.getByLabel("Stream key")).toBeVisible();
});

test("Guest sees the product Broadcast Countdown before the Room goes live", async ({
  page,
  request,
  context,
}) => {
  await signInHost(page, request, "broadcast-guest-countdown@example.com");

  await page.getByLabel("Room Title").fill("Guest countdown episode");
  await page.getByRole("button", { name: "Create Room" }).click();
  const inviteLink = await page
    .getByLabel("Guest Invite link for Guest countdown episode")
    .inputValue();
  const roomHref = await page.getByRole("link", { name: /Guest countdown episode/ }).getAttribute("href");
  expect(roomHref).toMatch(/^\/room\//);

  await enterBackstage(page, `${roomHref}/join`, "Host One");
  await page.getByLabel("RTMP server URL").fill("rtmp://a.rtmp.youtube.com/live2");
  await page.getByLabel("Stream key").fill("test-stream-key");
  await page.getByRole("button", { name: "Start Broadcast Countdown" }).click();
  await expect(page.getByTestId("broadcast-countdown")).toBeVisible();

  const guestPage = await context.newPage();
  await enterBackstage(guestPage, `${inviteLink}/join`, "Guest One");

  await expect(guestPage.getByTestId("broadcast-state")).toContainText("Broadcast Countdown");
  await expect(guestPage.getByTestId("broadcast-countdown")).toBeVisible();
  await expect(guestPage.getByTestId("broadcast-controls")).toHaveCount(0);
});
