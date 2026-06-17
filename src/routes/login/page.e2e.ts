import { expect, test } from "@playwright/test";

test("Host can request a magic link from the sign-in page", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Host sign in" })).toBeVisible();
  await page.getByLabel("Email").fill("host@example.com");
  await page.getByRole("button", { name: "Send magic link" }).click();

  await expect(
    page.getByText("If that email can sign in, a magic link is on the way."),
  ).toBeVisible();
});

test("Host can complete sign-in through the verify page without logging the token in the URL path", async ({
  page,
  request,
}) => {
  const loginResponse = await request.post("/auth/login", {
    data: { email: "verify-host@example.com" },
  });
  expect(loginResponse.status()).toBe(202);

  const latestTokenResponse = await request.get(
    `/auth/dev/latest-token?email=${encodeURIComponent("verify-host@example.com")}`,
  );
  const latestTokenBody = (await latestTokenResponse.json()) as { token: string | null };
  expect(latestTokenBody.token).toMatch(/^[\w-]+$/);

  await page.goto(`/auth/verify#${latestTokenBody.token}`);
  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByRole("heading", { name: "Host dashboard" })).toBeVisible();
});
