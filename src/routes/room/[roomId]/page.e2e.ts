import { expect, test } from "@playwright/test";

test("Host can open authless Room URL without signing in", async ({ page }) => {
  await page.goto("/room/demo");

  await expect(page.getByRole("heading", { level: 2 })).toContainText(
    "Prepare the Room before anything is Broadcasting",
  );
  await expect(page.getByText("Host Room URL", { exact: true })).toBeVisible();
  await expect(page.getByText("Backstage", { exact: true })).toBeVisible();
});

test("Guest can open Guest Invite URL without an Account", async ({ page }) => {
  await page.goto("/room/demo/invite/demo");

  await expect(page.getByRole("heading", { level: 2 })).toContainText(
    "Join the Room without creating an Account",
  );
  await expect(page.getByText("Guest Invite URL", { exact: true })).toBeVisible();
  await expect(page.getByText("Backstage", { exact: true })).toBeVisible();
});

test("Host and Guest entry pages highlight the active role", async ({ page }) => {
  await page.goto("/room/demo");
  await expect(page.getByRole("link", { name: "Host", exact: true })).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect(page.getByRole("link", { name: "Guest", exact: true })).toHaveAttribute(
    "data-active",
    "false",
  );

  await page.goto("/room/demo/invite/demo");
  await expect(page.getByRole("link", { name: "Guest", exact: true })).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect(page.getByRole("link", { name: "Host", exact: true })).toHaveAttribute(
    "data-active",
    "false",
  );
});
