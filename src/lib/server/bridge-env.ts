import { configureBridgeClient, isBridgeClientExplicitlyConfigured } from "./bridge-client";
import { env } from "$env/dynamic/private";

let configured = false;

export function clearBridgeEnvConfig(): void {
  configured = false;
}

export function ensureBridgeClientConfigured(): void {
  if (configured) {
    return;
  }

  if (!isBridgeClientExplicitlyConfigured()) {
    configureBridgeClient({
      enabled: env.BRIDGE_ENABLED === "1",
      controlBaseUrl: env.BRIDGE_CONTROL_URL ?? "http://127.0.0.1:8787",
      whipBaseUrl: env.BRIDGE_WHIP_URL ?? "http://127.0.0.1:8788",
    });
  }
  configured = true;
}
