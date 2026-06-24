/**
 * One-off compose-002 OBS supplementary capture verification.
 *
 * Usage:
 *   npm run build
 *   export OBS_WEBSOCKET_PASSWORD='local-obs-password'
 *   node scripts/verify/compose-002-obs-capture.mjs
 */

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const previewHost = "127.0.0.1";
const previewPort = 4173;
const obsPort = 4455;
const inputName = "iniLive Studio Composed Feed";
const canvasScreenshot = "/tmp/inilive-compose-002-canvas.png";
const obsScreenshot = "/tmp/inilive-compose-002-obs-preview.png";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startPreview() {
  return spawn("npm", ["run", "preview", "--", "--host", previewHost, "--port", String(previewPort)], {
    cwd: repoRoot,
    env: {
      ...process.env,
      LIVEKIT_URL: "",
      LIVEKIT_API_KEY: "",
      LIVEKIT_API_SECRET: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForPreview() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await new Promise((resolve, reject) => {
        const request = http.get(`http://${previewHost}:${previewPort}/`, (response) => {
          response.resume();
          if (response.statusCode && response.statusCode < 500) {
            resolve(undefined);
            return;
          }
          reject(new Error(`preview status ${response.statusCode}`));
        });
        request.on("error", reject);
      });
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error("preview server did not become ready");
}

async function isObsListening() {
  return new Promise((resolve) => {
    const socket = net.connect(obsPort, "127.0.0.1");
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function ensureObsRunning() {
  if (await isObsListening()) {
    return;
  }

  spawn("open", ["-a", "OBS"], { stdio: "ignore", detached: true }).unref();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isObsListening()) {
      return;
    }
    await sleep(1000);
  }

  throw new Error("OBS WebSocket did not start");
}

function authenticateObsWebSocket(password, helloPayload) {
  const { authentication } = helloPayload;
  if (!authentication) {
    return "";
  }

  const secret = crypto.createHash("sha256").update(password + authentication.salt).digest("base64");
  return crypto.createHash("sha256").update(secret + authentication.challenge).digest("base64");
}

function obsRequest(requestType, requestId, requestData = {}) {
  return JSON.stringify({
    op: 6,
    d: { requestType, requestId, requestData },
  });
}

async function captureObsWindow(pageTitle, password) {
  await ensureObsRunning();

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${obsPort}`);
    let stage = "connect";

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error(`OBS WebSocket timed out during ${stage}`));
    }, 20000);

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));

      if (message.op === 0) {
        socket.send(
          JSON.stringify({
            op: 1,
            d: {
              rpcVersion: 1,
              authentication: authenticateObsWebSocket(password, message.d),
              eventSubscriptions: 0,
            },
          }),
        );
        return;
      }

      if (message.op === 2) {
        stage = "create-input";
        socket.send(
          obsRequest("CreateInput", "create-input", {
            sceneName: "Scene",
            inputName,
            inputKind: "window_capture",
            inputSettings: {},
            sceneItemEnabled: true,
          }),
        );
        return;
      }

      if (message.op === 7 && message.d?.requestId === "create-input") {
        if (message.d.requestStatus?.code !== 100) {
          const comment = message.d.requestStatus?.comment ?? "";
          if (!comment.includes("already exists")) {
            clearTimeout(timeout);
            socket.close();
            reject(new Error(comment || "CreateInput failed"));
            return;
          }
        }

        stage = "list-windows";
        socket.send(
          obsRequest("GetInputPropertiesListPropertyItems", "list-windows", {
            inputName,
            propertyName: "window",
          }),
        );
        return;
      }

      if (message.op === 7 && message.d?.requestId === "list-windows") {
        if (message.d.requestStatus?.code !== 100) {
          clearTimeout(timeout);
          socket.close();
          reject(new Error(message.d.requestStatus?.comment ?? "Could not list OBS windows"));
          return;
        }

        const windows = message.d.responseData?.propertyItems ?? [];
        const match =
          windows.find((item) => item.itemName.includes(pageTitle)) ??
          windows.find((item) => /Backstage Room - iniLive Studio|iniLive Studio/.test(item.itemName));

        if (!match) {
          clearTimeout(timeout);
          socket.close();
          reject(
            new Error(
              `No OBS window matched page title "${pageTitle}". Available: ${windows
                .slice(0, 5)
                .map((item) => item.itemName)
                .join(", ")}`,
            ),
          );
          return;
        }

        stage = "set-window";
        socket.send(
          obsRequest("SetInputSettings", "set-window", {
            inputName,
            inputSettings: { window: match.itemValue },
            overlay: true,
          }),
        );
        return;
      }

      if (message.op === 7 && message.d?.requestId === "set-window") {
        if (message.d.requestStatus?.code !== 100) {
          clearTimeout(timeout);
          socket.close();
          reject(new Error(message.d.requestStatus?.comment ?? "SetInputSettings failed"));
          return;
        }

        stage = "screenshot";
        setTimeout(() => {
          socket.send(
            obsRequest("GetSourceScreenshot", "screenshot", {
              sourceName: inputName,
              imageFormat: "png",
              imageWidth: 1280,
              imageHeight: 720,
            }),
          );
        }, 1500);
        return;
      }

      if (message.op === 7 && message.d?.requestId === "screenshot") {
        clearTimeout(timeout);
        if (message.d.requestStatus?.code !== 100 || !message.d.responseData?.imageData) {
          socket.close();
          reject(new Error(message.d.requestStatus?.comment ?? "GetSourceScreenshot failed"));
          return;
        }

        fs.writeFileSync(obsScreenshot, Buffer.from(message.d.responseData.imageData, "base64"));
        socket.close();
        resolve({ path: obsScreenshot, bytes: fs.statSync(obsScreenshot).size });
      }
    });

    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("OBS WebSocket connection failed"));
    });
  });
}

async function captureCanvasEvidence(page) {
  const roomId = `obs-compose-${Date.now()}`;
  await page.goto(`http://${previewHost}:${previewPort}/room/${roomId}/join`);
  await page.getByLabel("Display Name").fill("Host One");
  await page.getByRole("button", { name: "Enter Room" }).click();
  await page.waitForURL(/\/backstage/);

  const canvas = page.getByTestId("composition-canvas");
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await canvas.screenshot({ path: canvasScreenshot });

  const frameSample = await page.evaluate(async () => {
    const element = document.querySelector('[data-testid="composition-canvas"]');
    if (!(element instanceof HTMLCanvasElement)) {
      return null;
    }

    const context = element.getContext("2d");
    if (!context) {
      return null;
    }

    const pixels = context.getImageData(640, 360, 1, 1).data;
    return {
      r: pixels[0],
      g: pixels[1],
      b: pixels[2],
      fps: document.querySelector('[data-testid="composition-fps"]')?.textContent ?? "",
      status: document.querySelector('[data-testid="capture-stream-status"]')?.textContent ?? "",
    };
  });

  return { frameSample, pageTitle: await page.title() };
}

const preview = startPreview();

try {
  await waitForPreview();

  const password = process.env.OBS_WEBSOCKET_PASSWORD;
  if (!password) {
    throw new Error("OBS_WEBSOCKET_PASSWORD is required for compose-002 OBS verification");
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const { frameSample, pageTitle } = await captureCanvasEvidence(page);
  await page.bringToFront();
  await page.waitForTimeout(1000);
  const obsResult = await captureObsWindow(pageTitle, password);
  await browser.close();

  console.log("Canvas evidence:", canvasScreenshot);
  console.log("Frame sample:", frameSample);
  console.log("OBS preview screenshot:", obsResult.path, obsResult.bytes, "bytes");

  if (!frameSample || frameSample.r + frameSample.g + frameSample.b === 0) {
    throw new Error("canvas frame sample looked empty");
  }

  if (obsResult.bytes < 5000) {
    console.warn(
      "OBS screenshot looked blank; grant macOS Screen Recording permission to OBS and re-run for full supplementary capture.",
    );
  }
} finally {
  preview.kill("SIGTERM");
}
