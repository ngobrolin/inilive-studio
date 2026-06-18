import { expect, test } from "@playwright/test";
import { setupProductRoom } from "$lib/testing/playwright/product-room";

test("Host can open Join Check from Room entry", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "join-check-host-entry@example.com",
    title: "Host join entry episode",
  });

  await page.goto(room.roomHref);
  await page.getByRole("link", { name: "Enter as Host" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Join Check");
  await expect(page.getByLabel("Display Name")).toBeVisible();
});

test("Guest can open Join Check from Guest Invite entry", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "join-check-guest-entry@example.com",
    title: "Guest join entry episode",
  });

  await page.context().clearCookies();
  await page.goto(room.inviteLink);
  await page.getByRole("link", { name: "Enter as Guest" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Join Check");
  await expect(page.getByLabel("Display Name")).toBeVisible();
});

test("Join Check requires a Display Name before entering the Room", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "join-check-required-name@example.com",
    title: "Required name episode",
  });

  await page.goto(`${room.roomHref}/join`);

  const enterButton = page.getByRole("button", { name: "Enter Room" });
  await expect(enterButton).toBeDisabled();

  await page.getByLabel("Display Name").fill("Riza");
  await expect(enterButton).toBeEnabled();
});

test("Display Name is limited to 50 characters", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "join-check-name-limit@example.com",
    title: "Name limit episode",
  });

  await page.goto(`${room.roomHref}/join`);

  const displayName = page.getByLabel("Display Name");
  await expect(displayName).toHaveAttribute("maxlength", "50");

  const longName = "a".repeat(51);
  await displayName.fill(longName);
  await expect(displayName).toHaveValue("a".repeat(50));
});

test("Join Check shows local preview when camera and microphone are granted", async ({
  page,
  request,
}) => {
  const room = await setupProductRoom(page, request, {
    email: "join-check-local-preview@example.com",
    title: "Local preview episode",
  });

  await page.goto(`${room.roomHref}/join`);

  await expect(page.getByTestId("local-preview")).toBeVisible();
});

test("Join Check lets a person choose initial microphone and camera state", async ({
  page,
  request,
}) => {
  const room = await setupProductRoom(page, request, {
    email: "join-check-device-state@example.com",
    title: "Device state episode",
  });

  await page.goto(`${room.roomHref}/join`);
  await expect(page.getByTestId("local-preview")).toBeVisible();

  const cameraButton = page.getByRole("button", { name: "Turn camera off" });
  const microphoneButton = page.getByRole("button", { name: "Mute microphone" });

  await cameraButton.click();
  await expect(page.getByRole("button", { name: "Turn camera on" })).toBeVisible();

  await microphoneButton.click();
  await expect(page.getByRole("button", { name: "Unmute microphone" })).toBeVisible();
});

test("Join Check shows recovery copy when permissions are denied", async ({ page, request }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Permission denied", "NotAllowedError");
    };
  });

  const room = await setupProductRoom(page, request, {
    email: "join-check-permission-denied@example.com",
    title: "Permission denied episode",
  });

  await page.goto(`${room.roomHref}/join`);

  await expect(page.getByText(/access was denied/i)).toBeVisible();
  await expect(page.getByText(/browser settings/i)).toBeVisible();
});

test("Join Check shows retry copy when no camera or microphone is found", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("No device found", "NotFoundError");
    };
  });

  const room = await setupProductRoom(page, request, {
    email: "join-check-no-device@example.com",
    title: "No device episode",
  });

  await page.goto(`${room.roomHref}/join`);

  await expect(page.getByText(/No camera or microphone was found/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("Join Check shows compatibility copy on unsupported browsers", async ({ page, request }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
  });

  const room = await setupProductRoom(page, request, {
    email: "join-check-unsupported-browser@example.com",
    title: "Unsupported browser episode",
  });

  await page.goto(`${room.roomHref}/join`);

  await expect(page.getByText(/not supported for Join Check/i)).toBeVisible();
  await expect(page.getByText(/Chromium-based desktop browser/i)).toBeVisible();
});

test("Join Check shows device selectors when media access is granted", async ({ page, request }) => {
  const room = await setupProductRoom(page, request, {
    email: "join-check-device-selectors@example.com",
    title: "Device selectors episode",
  });

  await page.goto(`${room.roomHref}/join`);
  await expect(page.getByTestId("local-preview")).toBeVisible();

  await expect(page.getByRole("combobox", { name: "Camera" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Microphone" })).toBeVisible();
});

test("Join Check shows a microphone level indicator when media access is granted", async ({
  page,
  request,
}) => {
  const room = await setupProductRoom(page, request, {
    email: "join-check-mic-level@example.com",
    title: "Mic level episode",
  });

  await page.goto(`${room.roomHref}/join`);
  await expect(page.getByTestId("local-preview")).toBeVisible();

  const microphoneLevel = page.getByRole("meter", { name: "Microphone level" });
  await expect(microphoneLevel).toBeVisible();
  await expect(microphoneLevel).toHaveAttribute("aria-valuemin", "0");
  await expect(microphoneLevel).toHaveAttribute("aria-valuemax", "100");
});
