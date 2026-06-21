import { expect, test } from "@playwright/test";

async function signInHost(
  page: import("@playwright/test").Page,
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
  await expect(page.getByRole("heading", { name: "Host dashboard" })).toBeVisible();
}

test("signed-in Host can create a reusable Room from the dashboard", async ({ page, request }) => {
  await signInHost(page, request, "dashboard-host@example.com");

  await page.getByLabel("Room Title").fill("Weekly show");
  await page.getByRole("button", { name: "Create Room" }).click();

  await expect(page.getByRole("link", { name: /Weekly show/ })).toBeVisible();
  await expect(page.getByLabel("Guest Invite link for Weekly show")).toHaveValue(
    /\/room\/[\w-]+\/invite\/[\w-]+$/,
  );
});

test("signed-in Host can start linking a YouTube channel from the dashboard", async ({
  page,
  request,
}) => {
  await signInHost(page, request, "dashboard-youtube-link@example.com");

  await expect(page.getByRole("heading", { name: "YouTube channel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Link YouTube channel" })).toBeVisible();
});

test("dashboard confirms when a Host returns from YouTube linking", async ({ page, request }) => {
  await signInHost(page, request, "dashboard-youtube-linked@example.com");

  await page.goto("/dashboard?youtube=linked");

  await expect(page.getByText("YouTube channel linked.")).toBeVisible();
});

test("dashboard explains safe YouTube unlink outcomes", async ({ page, request }) => {
  await signInHost(page, request, "dashboard-youtube-unlink-feedback@example.com");

  await page.goto("/dashboard?youtube=unlinked");
  await expect(page.getByText("YouTube channel unlinked and Google access revoked.")).toBeVisible();

  await page.goto("/dashboard?youtube=not-linked");
  await expect(
    page.getByText(
      "No linked YouTube channel was found. Link a channel before trying to unlink it.",
    ),
  ).toBeVisible();

  await page.goto("/dashboard?youtube=unlink-failed");
  await expect(
    page.getByText("Could not revoke Google access. The channel remains linked; please try again."),
  ).toBeVisible();

  await page.goto("/dashboard?youtube=unlink-cleanup-failed");
  await expect(
    page.getByText(
      "Google access was revoked, but Live Studio could not remove the saved channel link. Please try again or contact support.",
    ),
  ).toBeVisible();
});

test("signed-out Guest can open a valid product Guest Invite", async ({ page, request }) => {
  await signInHost(page, request, "dashboard-guest-invite@example.com");

  await page.getByLabel("Room Title").fill("Guest episode");
  await page.getByRole("button", { name: "Create Room" }).click();
  const inviteLink = await page.getByLabel("Guest Invite link for Guest episode").inputValue();

  await page.context().clearCookies();
  await page.goto(inviteLink);

  await expect(page.getByRole("heading", { name: "Choose a Room entry path" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Guest", exact: true })).toHaveAttribute(
    "data-active",
    "true",
  );
});

test("signed-out Guest cannot open an invalid product Guest Invite for an existing Room", async ({
  page,
  request,
}) => {
  await signInHost(page, request, "dashboard-invalid-guest-invite@example.com");

  await page.getByLabel("Room Title").fill("Invalid invite episode");
  await page.getByRole("button", { name: "Create Room" }).click();
  const inviteLink = await page
    .getByLabel("Guest Invite link for Invalid invite episode")
    .inputValue();
  const invalidInviteLink = inviteLink.replace(/invite\/[\w-]+$/, "invite/not-the-active-token");

  await page.context().clearCookies();
  await page.goto(invalidInviteLink);

  await expect(page.getByRole("heading", { name: "Guest Invite unavailable" })).toBeVisible();
});

test("Host can regenerate a Guest Invite so the old link no longer works", async ({
  page,
  request,
}) => {
  await signInHost(page, request, "dashboard-regenerate-invite@example.com");

  await page.getByLabel("Room Title").fill("Regenerate episode");
  await page.getByRole("button", { name: "Create Room" }).click();
  const oldInviteLink = await page
    .getByLabel("Guest Invite link for Regenerate episode")
    .inputValue();

  await page
    .getByRole("button", { name: "Regenerate Guest Invite for Regenerate episode" })
    .click();
  await expect
    .poll(() => page.getByLabel("Guest Invite link for Regenerate episode").inputValue())
    .not.toBe(oldInviteLink);
  const newInviteLink = await page
    .getByLabel("Guest Invite link for Regenerate episode")
    .inputValue();
  expect(newInviteLink).not.toBe(oldInviteLink);

  await page.context().clearCookies();
  await page.goto(oldInviteLink);
  await expect(page.getByRole("heading", { name: "Guest Invite unavailable" })).toBeVisible();
  await page.goto(`${oldInviteLink}/join`);
  await expect(page.getByRole("heading", { name: "Guest Invite unavailable" })).toBeVisible();

  await page.goto(newInviteLink);
  await expect(page.getByRole("heading", { name: "Choose a Room entry path" })).toBeVisible();
});

test("signed-in Host can open a Room from the dashboard", async ({ page, request }) => {
  await signInHost(page, request, "dashboard-open-room@example.com");

  await page.getByLabel("Room Title").fill("Weekly show");
  await page.getByRole("button", { name: "Create Room" }).click();

  await page.getByRole("link", { name: /Weekly show/ }).click();
  await expect(page).toHaveURL(/\/room\/[\w-]+$/);
  await expect(page.getByRole("heading", { name: "Choose a Room entry path" })).toBeVisible();
});

test("Host dashboard shows only the signed-in Host's Rooms", async ({ page, request }) => {
  await signInHost(page, request, "dashboard-host-one@example.com");
  await page.getByLabel("Room Title").fill("Host One room");
  await page.getByRole("button", { name: "Create Room" }).click();
  await expect(page.getByRole("link", { name: /Host One room/ })).toBeVisible();

  await page.context().clearCookies();
  await signInHost(page, request, "dashboard-host-two@example.com");

  await expect(page.getByRole("link", { name: /Host One room/ })).not.toBeVisible();
  await page.getByLabel("Room Title").fill("Host Two room");
  await page.getByRole("button", { name: "Create Room" }).click();
  await expect(page.getByRole("link", { name: /Host Two room/ })).toBeVisible();
});

test("unsigned visitors are redirected to Host sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
});
