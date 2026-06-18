import { expect, test } from "@playwright/test";
import {
  enterGuestBackstage,
  enterHostBackstage,
  setupProductRoom,
} from "$lib/testing/playwright/product-room";

test("Host can start and stop Screen Share state", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "screen-share-host@example.com",
    title: "Screen share host episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");

  await expect(page.getByTestId("screen-share-status")).toContainText(
    "No Screen Share is active.",
  );
  await page.getByRole("button", { name: "Start Screen Share" }).click();
  await expect(page.getByTestId("screen-share-status")).toContainText(
    "Host One is sharing their screen.",
  );
  await page.getByRole("button", { name: "Stop Screen Share" }).click();
  await expect(page.getByTestId("screen-share-status")).toContainText(
    "No Screen Share is active.",
  );

  await page.goto(hostUrl);
  await expect(page.getByRole("button", { name: "Start Screen Share" })).toBeVisible();
});

test("Guests can see active Screen Share state but cannot start Screen Share", async ({
  page,
  request,
}) => {
  const room = await setupProductRoom(page, request, {
    email: "screen-share-guest@example.com",
    title: "Screen share guest episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");
  const guestUrl = await enterGuestBackstage(page, room.guestJoinUrl, "Guest One");

  await page.goto(hostUrl);
  await page.getByRole("button", { name: "Start Screen Share" }).click();

  await page.goto(guestUrl);
  await expect(page.getByTestId("screen-share-status")).toContainText(
    "Host One is sharing their screen.",
  );
  await expect(page.getByRole("button", { name: "Start Screen Share" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop Screen Share" })).toHaveCount(0);
});
