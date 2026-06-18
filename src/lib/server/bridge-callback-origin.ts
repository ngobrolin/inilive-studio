import { env } from "$env/dynamic/private";

let configuredOrigin: string | null | undefined;

export function configureBridgeCallbackOrigin(origin: string | null): void {
  configuredOrigin = origin;
}

export function clearBridgeCallbackOrigin(): void {
  configuredOrigin = undefined;
}

/**
 * Origin the Broadcast Bridge uses to POST health callbacks to SvelteKit.
 *
 * When the bridge runs in Podman/Docker, request.origin (http://127.0.0.1:4173)
 * is unreachable from inside the container. On macOS Podman use:
 * BRIDGE_CALLBACK_ORIGIN=http://host.containers.internal:4173
 */
export function resolveBridgeCallbackOrigin(requestOrigin: string): string {
  if (configuredOrigin === null) {
    return requestOrigin;
  }
  if (configuredOrigin !== undefined) {
    return configuredOrigin;
  }
  const envOrigin = env.BRIDGE_CALLBACK_ORIGIN?.trim();
  return envOrigin || requestOrigin;
}
