export async function withMediaSetupTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export const LIVEKIT_TOKEN_REFRESH_LEAD_MS = 10 * 60 * 1000;

export function liveKitTokenRefreshDelayMs(expiresAtMs: number, now = Date.now()): number {
  return Math.max(0, expiresAtMs - LIVEKIT_TOKEN_REFRESH_LEAD_MS - now);
}

type LiveKitRoomInternals = {
  engine?: { token?: string };
  regionUrlProvider?: { updateToken(token: string): void };
};

export function applyRefreshedLiveKitRoomToken(room: unknown, token: string): void {
  const internals = room as LiveKitRoomInternals;
  if (internals.engine) {
    internals.engine.token = token;
  }
  internals.regionUrlProvider?.updateToken(token);
}

export type LiveKitTokenRefreshHandle = {
  cancel(): void;
};

export function startLiveKitTokenRefresh(input: {
  expiresAt: number;
  fetchToken: () => Promise<{ token: string; expiresAt: number }>;
  onToken: (token: string, expiresAt: number) => void;
  now?: () => number;
}): LiveKitTokenRefreshHandle {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const schedule = (expiresAt: number) => {
    if (cancelled) {
      return;
    }

    const delayMs = liveKitTokenRefreshDelayMs(expiresAt, input.now?.() ?? Date.now());
    timeoutId = setTimeout(() => {
      void refresh();
    }, delayMs);
  };

  const refresh = async () => {
    if (cancelled) {
      return;
    }

    try {
      const refreshed = await input.fetchToken();
      if (cancelled) {
        return;
      }

      input.onToken(refreshed.token, refreshed.expiresAt);
      schedule(refreshed.expiresAt);
    } catch {
      if (cancelled) {
        return;
      }

      timeoutId = setTimeout(() => {
        void refresh();
      }, 60_000);
    }
  };

  schedule(input.expiresAt);

  return {
    cancel() {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    },
  };
}

export function liveKitSessionKey(input: {
  stub: boolean;
  token: string;
  serverUrl: string;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  screenShareActive: boolean;
  canScreenShare: boolean;
}): string {
  if (input.stub) {
    return "stub";
  }

  return [
    input.token,
    input.serverUrl,
    input.cameraEnabled,
    input.microphoneEnabled,
    input.screenShareActive,
    input.canScreenShare,
  ].join(":");
}

export function formatLiveKitConnectionError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to start Room media";
}
