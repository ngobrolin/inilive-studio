import { formatLiveKitConnectionError } from "./livekit-media";

export type ScreenSharePublisher = {
  setEnabled(enabled: boolean): Promise<void>;
};

let publisher: ScreenSharePublisher | null = null;

export function registerScreenSharePublisher(next: ScreenSharePublisher | null): void {
  publisher = next;
}

export async function requestScreenShareToggle(
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!publisher) {
    return { ok: true };
  }

  try {
    await publisher.setEnabled(enabled);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: formatLiveKitConnectionError(error) };
  }
}
