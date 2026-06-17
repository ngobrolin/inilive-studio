/**
 * bridge-003 GStreamer bridge verification.
 *
 * Usage:
 *   node scripts/verify/bridge-003-gstreamer.mjs
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateBridgeVerification } from "./bridge-003-gstreamer-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const bridgeDir = path.join(repoRoot, "services/broadcast-bridge");
const imageName = "inilive-broadcast-bridge:bridge-003";
const requiredGStreamerElements = ["whipserversrc", "x264enc", "avenc_aac", "flvmux", "rtmpsink"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed (${code}): ${stderr || stdout}`));
    });
  });
}

function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

function parseGStreamerVersion(output) {
  const match = output.match(/version\s+(\d+)\.(\d+)/i) ?? output.match(/(\d+)\.(\d+)(?:\.\d+)?\s*$/);
  const major = Number(match?.[1] ?? 0);
  const minor = Number(match?.[2] ?? 0);
  return {
    major,
    minor,
    meetsMinimum: major > 1 || (major === 1 && minor >= 22),
  };
}

async function verifyLocalGStreamer() {
  const { stdout, stderr } = await run("gst-launch-1.0", ["--version"]);
  const version = parseGStreamerVersion(`${stdout}\n${stderr}`);
  if (!version.meetsMinimum) {
    throw new Error(`Local GStreamer ${version.major}.${version.minor} is below 1.22`);
  }
  return version;
}

async function buildImage(podmanCommand) {
  if (!(await commandExists(podmanCommand))) {
    return false;
  }

  try {
    await run(podmanCommand, ["build", "-t", imageName, bridgeDir], { cwd: repoRoot });
    return true;
  } catch (error) {
    console.warn(
      `Skipping container build: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

async function verifyContainerGStreamer(podmanCommand) {
  const { stdout, stderr } = await run(podmanCommand, [
    "run",
    "--rm",
    imageName,
    "gst-launch-1.0",
    "--version",
  ]);
  const version = parseGStreamerVersion(`${stdout}\n${stderr}`);
  if (!version.meetsMinimum) {
    throw new Error(`Container GStreamer ${version.major}.${version.minor} is below 1.22`);
  }
  return version;
}

async function verifyContainerElements(podmanCommand) {
  for (const element of requiredGStreamerElements) {
    await run(podmanCommand, ["run", "--rm", imageName, "gst-inspect-1.0", element]);
  }
}

async function verifyControlApi() {
  const bridgeProcess = spawn("node", ["src/server.mjs"], {
    cwd: bridgeDir,
    env: {
      ...process.env,
      BRIDGE_CONTROL_PORT: "9877",
      BRIDGE_WHIP_PORT: "9878",
      BRIDGE_WHIP_SESSION_BASE_PORT: "9890",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let bridgeOutput = "";
  bridgeProcess.stdout.on("data", (chunk) => {
    bridgeOutput += chunk.toString();
  });
  bridgeProcess.stderr.on("data", (chunk) => {
    bridgeOutput += chunk.toString();
  });

  try {
    let health = null;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const response = await fetch("http://127.0.0.1:9877/health");
        if (response.ok) {
          health = await response.json();
          break;
        }
      } catch {
        await sleep(200);
      }
    }

    if (!health) {
      throw new Error(`Bridge health endpoint did not become ready:\n${bridgeOutput}`);
    }

    const sessionResponse = await fetch("http://127.0.0.1:9877/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: "bridge-003",
        rtmpServerUrl: "rtmp://test.example/live",
        streamKey: "secret-stream-key",
      }),
    });

    if (sessionResponse.status !== 201) {
      throw new Error(`Expected session start 201, received ${sessionResponse.status}`);
    }

    const session = await sessionResponse.json();
    if (!session.rtmpLocation.includes("[redacted]")) {
      throw new Error("Bridge session response did not redact RTMP location");
    }
    if (session.rtmpLocation.includes("secret-stream-key")) {
      throw new Error("Bridge session response leaked stream key");
    }

    const deleteResponse = await fetch("http://127.0.0.1:9877/sessions/bridge-003", {
      method: "DELETE",
    });
    if (deleteResponse.status !== 204) {
      throw new Error(`Expected session delete 204, received ${deleteResponse.status}`);
    }
  } finally {
    bridgeProcess.kill("SIGTERM");
    await sleep(200);
  }
}

async function main() {
  const results = [];
  const verification = {
    containerBuilt: false,
    containerGStreamer: null,
    containerElementsAvailable: false,
    controlApiSessionLifecycle: false,
  };

  if (await commandExists("gst-launch-1.0")) {
    const localVersion = await verifyLocalGStreamer();
    results.push(`local gstreamer ${localVersion.major}.${localVersion.minor}`);
  } else {
    results.push("local gstreamer not installed");
  }

  const podmanCommand = (await commandExists("podman")) ? "podman" : null;
  if (podmanCommand) {
    const built = await buildImage(podmanCommand);
    verification.containerBuilt = built;
    if (built) {
      const containerVersion = await verifyContainerGStreamer(podmanCommand);
      verification.containerGStreamer = containerVersion;
      results.push(`container gstreamer ${containerVersion.major}.${containerVersion.minor}`);
      await verifyContainerElements(podmanCommand);
      verification.containerElementsAvailable = true;
      results.push(`container elements ${requiredGStreamerElements.join(", ")}`);
    }
  } else {
    results.push("podman not available; skipped container build");
  }

  if (await commandExists("node")) {
    await verifyControlApi();
    verification.controlApiSessionLifecycle = true;
    results.push("control api session lifecycle");
  }

  const outcome = evaluateBridgeVerification(verification);
  if (!outcome.passed) {
    throw new Error(`bridge-003 verification failed:\n- ${outcome.failures.join("\n- ")}`);
  }

  console.log("bridge-003 verification passed:");
  for (const result of results) {
    console.log(`- ${result}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
