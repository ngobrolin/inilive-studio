import { expect, test } from "@playwright/test";
import {
  enterHostBackstage,
  setupProductRoom,
  startProductBroadcast,
} from "$lib/testing/playwright/product-room";

test("Host can start Screen Share during a Broadcast without stopping it", async ({
  page,
  request,
}) => {
  const room = await setupProductRoom(page, request, {
    email: "screen-share-broadcast@example.com",
    title: "Screen share broadcast episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");

  await page.goto(hostUrl);
  await startProductBroadcast(page);
  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcasting");

  await page.getByRole("button", { name: "Start Screen Share" }).click();
  await expect(page.getByTestId("screen-share-status")).toContainText(
    "Host One is sharing their screen.",
  );
  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcasting");
  await expect(page.getByTestId("composition-primary-source")).toContainText("Screen Share");
  await expect(page.getByTestId("whip-ingest-status")).toContainText("WHIP ingest connected");

  await page.getByRole("button", { name: "Stop Screen Share" }).click();
  await expect(page.getByTestId("screen-share-status")).toContainText(
    "No Screen Share is active.",
  );
  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcasting");
  await expect(page.getByTestId("whip-ingest-status")).toContainText("WHIP ingest connected");
});

test("Ending a Broadcast clears active Screen Share before the next Broadcast", async ({
  page,
  request,
}) => {
  const room = await setupProductRoom(page, request, {
    email: "screen-share-reset@example.com",
    title: "Screen share reset episode",
  });

  const hostUrl = await enterHostBackstage(page, room.roomHref, "Host One");

  await page.goto(hostUrl);
  await startProductBroadcast(page);
  await page.getByRole("button", { name: "Start Screen Share" }).click();
  await expect(page.getByTestId("composition-primary-source")).toContainText("Screen Share");

  await page.getByRole("button", { name: "End Broadcast" }).click();
  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcast ended");
  await expect(page.getByTestId("screen-share-status")).toContainText(
    "No Screen Share is active.",
  );

  await startProductBroadcast(page);
  await expect(page.getByTestId("broadcast-state")).toContainText("Broadcasting");
  await expect(page.getByRole("button", { name: "Start Screen Share" })).toBeVisible();
  await expect(page.getByTestId("composition-primary-source")).not.toContainText("Screen Share");
});
