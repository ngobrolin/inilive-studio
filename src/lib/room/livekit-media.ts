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
