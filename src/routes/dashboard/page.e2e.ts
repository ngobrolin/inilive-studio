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

  await expect(page.getByText("Weekly show")).toBeVisible();
});

test("Host dashboard shows only the signed-in Host's Rooms", async ({ page, request }) => {
  await signInHost(page, request, "dashboard-host-one@example.com");
  await page.getByLabel("Room Title").fill("Host One room");
  await page.getByRole("button", { name: "Create Room" }).click();
  await expect(page.getByText("Host One room")).toBeVisible();

  await page.context().clearCookies();
  await signInHost(page, request, "dashboard-host-two@example.com");

  await expect(page.getByText("Host One room")).not.toBeVisible();
  await page.getByLabel("Room Title").fill("Host Two room");
  await page.getByRole("button", { name: "Create Room" }).click();
  await expect(page.getByText("Host Two room")).toBeVisible();
});

test("unsigned visitors are redirected to Host sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/login");
});
