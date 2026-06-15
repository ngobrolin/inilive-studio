import { describe, expect, it } from "vitest";
import { createMediaJoinGrant } from "./media-join";

describe("media join grants", () => {
  it("returns a stub grant when LiveKit credentials are not configured", async () => {
    const grant = await createMediaJoinGrant({
      roomId: "demo",
      participantId: "participant-1",
      displayName: "Host One",
      role: "host",
    });

    expect(grant).toEqual({
      provider: "livekit",
      stub: true,
      roomName: "demo",
      participantIdentity: "participant-1",
      token: "stub-token",
      serverUrl: "wss://stub.livekit.cloud",
      displayName: "Host One",
      role: "host",
    });
  });

  it("returns null when the participant id is missing", async () => {
    await expect(
      createMediaJoinGrant({
        roomId: "demo",
        participantId: "",
        displayName: "Host One",
        role: "host",
      }),
    ).resolves.toBeNull();
  });
});
