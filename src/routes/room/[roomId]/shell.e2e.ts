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

  await page.goto("about:blank");
  await page.goto(`/auth/verify#${latestTokenBody.token}`);
  await expect(page).toHaveURL("/dashboard");
}

async function createProductRoom(page: Page, title: string) {
  await page.getByLabel("Room Title").fill(title);
  await page.getByRole("button", { name: "Create Room" }).click();
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  return page.getByRole("link", { name: new RegExp(title) }).getAttribute("href");
}

test("unsigned visitors are redirected to sign in for product Room host entry", async ({
  page,
  request,
}) => {
  await signInHost(page, request, "shell-unsigned-host@example.com");
  const roomHref = await createProductRoom(page, "Protected episode");

  await page.context().clearCookies();
  await page.goto(roomHref!);

  await expect(page).toHaveURL("/login");
});

test("another signed-in Host cannot enter someone else's product Room", async ({
  page,
  request,
}) => {
  await signInHost(page, request, "shell-owner-host@example.com");
  const roomHref = await createProductRoom(page, "Owner episode");

  await page.context().clearCookies();
  await signInHost(page, request, "shell-other-host@example.com");
  await page.goto(roomHref!);

  await expect(page).toHaveURL("/dashboard");
});

test("signed-in Room owner can enter Join Check and Backstage for a product Room", async ({
  page,
  request,
}) => {
  await signInHost(page, request, "shell-owner-join@example.com");
  const roomHref = await createProductRoom(page, "Owner join episode");

  await page.goto(`${roomHref}/join`);
  await page.getByLabel("Display Name").fill("Host One");
  await page.getByRole("button", { name: "Enter Room" }).click();

  await expect(page).toHaveURL(/\/backstage/);
  await expect(page.getByRole("heading", { name: "Room presence" })).toBeVisible();
});

test("signed-out Guest can still enter a product Room through a valid Guest Invite", async ({
  page,
  request,
}) => {
  await signInHost(page, request, "shell-guest-entry@example.com");
  await createProductRoom(page, "Guest entry episode");
  const inviteLink = await page
    .getByLabel("Guest Invite link for Guest entry episode")
    .inputValue();

  await page.context().clearCookies();
  await page.goto(inviteLink);

  await expect(page.getByRole("heading", { name: "Choose a Room entry path" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Guest", exact: true })).toHaveAttribute(
    "data-active",
    "true",
  );
});

test("Host moderation works in a signed-in product Room flow", async ({
  page,
  request,
  context,
}) => {
  await signInHost(page, request, "shell-moderation-host@example.com");
  const roomHref = await createProductRoom(page, "Moderation episode");
  const inviteLink = await page.getByLabel("Guest Invite link for Moderation episode").inputValue();

  await page.goto(`${roomHref}/join`);
  await page.getByLabel("Display Name").fill("Host One");
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);
  const hostUrl = page.url();

  const guestPage = await context.newPage();
  await guestPage.goto(`${inviteLink}/join`);
  await guestPage.getByLabel("Display Name").fill("Guest One");
  await guestPage.getByRole("button", { name: "Enter Room" }).click();
  await expect(guestPage).toHaveURL(/\/backstage/);
  const guestUrl = guestPage.url();

  await page.goto(hostUrl);
  await page.getByRole("button", { name: "Force mute Guest One" }).click();
  await expect(page.getByText("Host-muted")).toBeVisible();

  await guestPage.goto(guestUrl);
  await expect(guestPage.getByText("The Host muted your microphone")).toBeVisible();
});

test("Room Chat stays ephemeral in a product Room session", async ({ page, request, context }) => {
  await signInHost(page, request, "shell-room-chat-host@example.com");
  const roomHref = await createProductRoom(page, "Chat episode");
  const inviteLink = await page.getByLabel("Guest Invite link for Chat episode").inputValue();

  await page.goto(`${roomHref}/join`);
  await page.getByLabel("Display Name").fill("Host One");
  await page.getByRole("button", { name: "Enter Room" }).click();
  await expect(page).toHaveURL(/\/backstage/);

  const guestPage = await context.newPage();
  await guestPage.goto(`${inviteLink}/join`);
  await guestPage.getByLabel("Display Name").fill("Guest One");
  await guestPage.getByRole("button", { name: "Enter Room" }).click();
  await expect(guestPage).toHaveURL(/\/backstage/);

  await page.getByLabel("Room Chat message").fill("Hello from the Host");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Hello from the Host")).toBeVisible();

  await guestPage.reload();
  await expect(guestPage.getByText("Hello from the Host")).toBeVisible();

  await guestPage.getByLabel("Room Chat message").fill("Hello from the Guest");
  await guestPage.getByRole("button", { name: "Send message" }).click();
  await page.reload();
  await expect(page.getByText("Hello from the Guest")).toBeVisible();
});
