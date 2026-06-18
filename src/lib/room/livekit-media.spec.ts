import { describe, expect, it } from "vitest";
import {
  formatLiveKitConnectionError,
  liveKitSessionKey,
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
});
