import { env } from "$env/dynamic/private";

let configuredSecret: string | null = null;

export function configureBridgeCallbackHmacSecret(secret: string | null): void {
  configuredSecret = secret;
}

export function readBridgeCallbackHmacSecret(): string {
  return (
    configuredSecret ??
    env.BRIDGE_CALLBACK_HMAC_SECRET ??
    "dev-bridge-callback-hmac-secret"
  );
}
