type BridgeClientConfig = {
  controlBaseUrl: string;
  whipBaseUrl: string;
  enabled: boolean;
};

const defaultConfig: BridgeClientConfig = {
  controlBaseUrl: "http://127.0.0.1:8787",
  whipBaseUrl: "http://127.0.0.1:8788",
  enabled: false,
};

let config: BridgeClientConfig = { ...defaultConfig };
let explicitlyConfigured = false;

export function configureBridgeClient(next: Partial<BridgeClientConfig>): void {
  config = { ...config, ...next };
  explicitlyConfigured = true;
}

export function clearBridgeClientConfig(): void {
  config = { ...defaultConfig };
  explicitlyConfigured = false;
}

export function isBridgeClientExplicitlyConfigured(): boolean {
  return explicitlyConfigured;
}

export function readBridgeClientConfig(): BridgeClientConfig {
  return { ...config };
}

export function isBridgeClientEnabled(): boolean {
  return config.enabled;
}

export async function startBridgeSession(input: {
  roomId: string;
  rtmpServerUrl: string;
  streamKey: string;
  callbackUrl: string;
  callbackBearerToken: string;
}): Promise<void> {
  if (!config.enabled) {
    return;
  }

  const response = await fetch(`${config.controlBaseUrl}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Bridge session start failed with status ${response.status}`);
  }
}

export async function stopBridgeSession(input: { roomId: string }): Promise<void> {
  if (!config.enabled) {
    return;
  }

  const response = await fetch(
    `${config.controlBaseUrl}/sessions/${encodeURIComponent(input.roomId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Bridge session stop failed with status ${response.status}`);
  }
}

export async function forwardWhipIngest(input: {
  roomId: string;
  authorizationHeader: string;
  body: string;
  contentType: string;
}): Promise<Response> {
  if (!config.enabled) {
    return new Response("WHIP ingest authenticated; bridge ingest is not enabled.", {
      status: 202,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const response = await fetch(`${config.whipBaseUrl}/whip/${encodeURIComponent(input.roomId)}`, {
    method: "POST",
    headers: {
      Authorization: input.authorizationHeader,
      "Content-Type": input.contentType,
    },
    body: input.body,
  });

  return response;
}
