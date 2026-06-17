import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { sendBroadcastHealthCallback } from "./callbacks.mjs";
import { buildGstLaunchArgs, buildRtmpSinkLocation, redactRtmpSinkLocation } from "./pipeline.mjs";

const CONTROL_PORT = Number(process.env.BRIDGE_CONTROL_PORT ?? 8787);
const WHIP_PORT = Number(process.env.BRIDGE_WHIP_PORT ?? 8788);
const WHIP_SESSION_BASE_PORT = Number(process.env.BRIDGE_WHIP_SESSION_BASE_PORT ?? 8790);

/** @type {Map<string, { roomId: string, whipPort: number, process: import('node:child_process').ChildProcessWithoutNullStreams | null, rtmpLocation: string, callbackUrl: string, callbackBearerToken: string, terminalReported: boolean }>} */
const sessions = new Map();
let nextSessionPortOffset = 0;

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function reportBroadcastHealth(session, status, message) {
  sendBroadcastHealthCallback({
    callbackUrl: session.callbackUrl,
    callbackBearerToken: session.callbackBearerToken,
    callbackHmacSecret: process.env.BRIDGE_CALLBACK_HMAC_SECRET ?? "dev-bridge-callback-hmac-secret",
    status,
    message,
  }).catch((error) => {
    process.stderr.write(`[bridge:${session.whipPort}] health callback failed: ${error.message}\n`);
  });
}

function reportTerminalBroadcastHealth(session, status, message) {
  if (session.terminalReported) {
    return;
  }

  session.terminalReported = true;
  reportBroadcastHealth(session, status, message);
}

async function readGStreamerVersion() {
  return new Promise((resolve) => {
    const child = spawn("gst-launch-1.0", ["--version"]);
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("close", () => resolve(output.trim()));
    child.on("error", () => resolve(""));
  });
}

function startPipeline(session) {
  reportBroadcastHealth(
    session,
    "connecting",
    "Broadcast Bridge is connecting to the Broadcast Destination.",
  );
  const gstArgs = buildGstLaunchArgs({
    whipPort: session.whipPort,
    rtmpLocation: session.rtmpLocation,
  });
  const env = { ...process.env };
  if (process.env.GST_PLUGIN_PATH) {
    env.GST_PLUGIN_PATH = process.env.GST_PLUGIN_PATH;
  }

  const child = spawn("gst-launch-1.0", gstArgs, { env, stdio: ["ignore", "pipe", "pipe"] });
  child.on("error", (error) => {
    process.stderr.write(
      `[bridge:${session.whipPort}] failed to start pipeline: ${error.message}\n`,
    );
    session.process = null;
    reportTerminalBroadcastHealth(session, "failed", "Broadcast Bridge failed to start.");
  });
  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[bridge:${session.whipPort}] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk
      .toString()
      .replaceAll(session.rtmpLocation, redactRtmpSinkLocation(session.rtmpLocation));
    process.stderr.write(`[bridge:${session.whipPort}] ${text}`);
    if (/warning/i.test(text)) {
      reportBroadcastHealth(session, "degraded", "Broadcast Bridge reports degraded output.");
    }
  });
  child.on("exit", (code) => {
    process.stderr.write(
      `[bridge:${session.whipPort}] pipeline exited with code ${code ?? "unknown"}\n`,
    );
    session.process = null;
    if (!session.terminalReported) {
      reportTerminalBroadcastHealth(
        session,
        code === 0 ? "ended" : "failed",
        code === 0 ? "Broadcast Bridge ended the Broadcast." : "RTMP output disconnected.",
      );
    }
  });

  session.process = child;
}

function stopPipeline(session) {
  reportTerminalBroadcastHealth(session, "ended", "Broadcast Bridge ended the Broadcast.");

  if (!session.process || session.process.killed) {
    return;
  }

  session.process.kill("SIGTERM");
  session.process = null;
}

async function proxyWhipRequest(roomId, request, response) {
  const session = sessions.get(roomId);
  if (!session) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("No active bridge session for this Room.");
    return;
  }

  const targetUrl = `http://127.0.0.1:${session.whipPort}/whip/endpoint`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  const body = await new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });

  const bridgeResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });
  if (bridgeResponse.ok) {
    reportBroadcastHealth(
      session,
      "connected",
      "Broadcast Bridge is connected to the Broadcast Destination.",
    );
  }

  response.writeHead(bridgeResponse.status, Object.fromEntries(bridgeResponse.headers.entries()));
  response.end(Buffer.from(await bridgeResponse.arrayBuffer()));
}

const controlServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${CONTROL_PORT}`);

  if (request.method === "GET" && url.pathname === "/health") {
    const versionOutput = await readGStreamerVersion();
    sendJson(response, 200, {
      ok: true,
      gstreamerVersion: versionOutput,
      activeSessions: sessions.size,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/sessions") {
    try {
      const payload = await readJson(request);
      const roomId = String(payload.roomId ?? "").trim();
      const rtmpServerUrl = String(payload.rtmpServerUrl ?? "").trim();
      const streamKey = String(payload.streamKey ?? "").trim();
      const callbackUrl = String(payload.callbackUrl ?? "").trim();
      const callbackBearerToken = String(payload.callbackBearerToken ?? "").trim();

      if (!roomId || !rtmpServerUrl || !streamKey || !callbackUrl || !callbackBearerToken) {
        sendJson(response, 400, {
          error:
            "roomId, rtmpServerUrl, streamKey, callbackUrl, and callbackBearerToken are required.",
        });
        return;
      }

      if (sessions.has(roomId)) {
        sendJson(response, 409, { error: "A bridge session already exists for this Room." });
        return;
      }

      const whipPort = WHIP_SESSION_BASE_PORT + nextSessionPortOffset;
      nextSessionPortOffset += 1;
      const rtmpLocation = buildRtmpSinkLocation({ rtmpServerUrl, streamKey });
      const session = {
        roomId,
        whipPort,
        process: null,
        rtmpLocation,
        callbackUrl,
        callbackBearerToken,
        terminalReported: false,
      };
      sessions.set(roomId, session);
      startPipeline(session);

      sendJson(response, 201, {
        roomId,
        whipPort,
        rtmpLocation: redactRtmpSinkLocation(rtmpLocation),
      });
      return;
    } catch {
      sendJson(response, 400, { error: "Invalid JSON body." });
      return;
    }
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/sessions/")) {
    const roomId = decodeURIComponent(url.pathname.slice("/sessions/".length));
    const session = sessions.get(roomId);
    if (!session) {
      response.writeHead(404);
      response.end();
      return;
    }

    stopPipeline(session);
    sessions.delete(roomId);
    response.writeHead(204);
    response.end();
    return;
  }

  response.writeHead(404);
  response.end();
});

const whipServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${WHIP_PORT}`);
  const match = url.pathname.match(/^\/whip\/([^/]+)$/);
  if (request.method === "POST" && match) {
    await proxyWhipRequest(decodeURIComponent(match[1]), request, response);
    return;
  }

  response.writeHead(404);
  response.end();
});

controlServer.listen(CONTROL_PORT, "127.0.0.1", () => {
  process.stdout.write(
    `Broadcast bridge control API listening on http://127.0.0.1:${CONTROL_PORT}\n`,
  );
});

whipServer.listen(WHIP_PORT, "127.0.0.1", () => {
  process.stdout.write(`Broadcast bridge WHIP proxy listening on http://127.0.0.1:${WHIP_PORT}\n`);
});
