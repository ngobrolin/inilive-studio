import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyRefreshedLiveKitRoomToken,
  formatLiveKitConnectionError,
  liveKitSessionKey,
  liveKitTokenRefreshDelayMs,
  startLiveKitTokenRefresh,
  withMediaSetupTimeout,
} from "./livekit-media";

describe("livekit media helpers", () => {
  it("times out slow camera or microphone setup", async () => {
    await expect(
      withMediaSetupTimeout(
        new Promise<string>(() => {}),
        20,
        "Camera setup timed out.",
      ),
    ).rejects.toThrow("Camera setup timed out.");
  });

  it("builds a stable LiveKit session key from grant and media choices", () => {
    expect(
      liveKitSessionKey({
        stub: false,
        token: "token-a",
        serverUrl: "wss://example.livekit.cloud",
        cameraEnabled: true,
        microphoneEnabled: true,
        screenShareActive: false,
        canScreenShare: false,
      }),
    ).toBe("token-a:wss://example.livekit.cloud:true:true:false:false");
  });

  it("formats unknown connection errors safely", () => {
    expect(formatLiveKitConnectionError(new Error("permission denied"))).toBe(
      "permission denied",
    );
    expect(formatLiveKitConnectionError("broken")).toBe("Unable to start Room media");
  });

  it("schedules refresh ten minutes before the grant expires", () => {
    const now = 1_700_000_000_000;
    const expiresAt = now + 60 * 60 * 1000;

    expect(liveKitTokenRefreshDelayMs(expiresAt, now)).toBe(50 * 60 * 1000);
    expect(liveKitTokenRefreshDelayMs(now + 5 * 60 * 1000, now)).toBe(0);
  });

  it("stores refreshed tokens on the connected LiveKit room engine", () => {
    const room = {
      engine: { token: "old-token" },
      regionUrlProvider: { updateToken: vi.fn() },
    };

    applyRefreshedLiveKitRoomToken(room, "new-token");

    expect(room.engine.token).toBe("new-token");
    expect(room.regionUrlProvider.updateToken).toHaveBeenCalledWith("new-token");
  });

  describe("startLiveKitTokenRefresh", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("fetches and applies a refreshed token before expiry", async () => {
      const fetchToken = vi
        .fn()
        .mockResolvedValueOnce({ token: "refreshed-token", expiresAt: 2_000_000 });
      const onToken = vi.fn();
      const now = 1_000_000;
      const handle = startLiveKitTokenRefresh({
        expiresAt: now + 60 * 60 * 1000,
        fetchToken,
        onToken,
        now: () => now,
      });

      await vi.advanceTimersByTimeAsync(50 * 60 * 1000);
      await Promise.resolve();

      expect(fetchToken).toHaveBeenCalledTimes(1);
      expect(onToken).toHaveBeenCalledWith("refreshed-token", 2_000_000);
      handle.cancel();
    });
  });
});
