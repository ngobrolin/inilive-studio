import { describe, expect, it } from "vitest";
import { createMediaJoinGrant } from "./media-join";

describe("media join grants", () => {
  it("returns a stub grant when LiveKit credentials are not configured", async () => {
    const grant = await createMediaJoinGrant(
      {
        roomId: "demo",
        participantId: "participant-1",
        displayName: "Host One",
        role: "host",
      },
      { apiKey: undefined, apiSecret: undefined, serverUrl: undefined },
    );

    expect(grant).toMatchObject({
      provider: "livekit",
      stub: true,
      roomName: "demo",
      participantIdentity: "participant-1",
      token: "stub-token",
      serverUrl: "wss://stub.livekit.cloud",
      displayName: "Host One",
      role: "host",
    });
    expect(grant?.expiresAt).toBeGreaterThan(Date.now());
  });

  it("returns a non-stub grant when LiveKit credentials are configured", async () => {
    const grant = await createMediaJoinGrant(
      {
        roomId: "demo",
        participantId: "participant-1",
        displayName: "Host One",
        role: "host",
      },
      {
        apiKey: "devkey",
        apiSecret: "secret",
        serverUrl: "wss://example.livekit.cloud",
      },
    );

    expect(grant).toMatchObject({
      provider: "livekit",
      stub: false,
      roomName: "demo",
      participantIdentity: "participant-1",
      serverUrl: "wss://example.livekit.cloud",
      displayName: "Host One",
      role: "host",
    });
    expect(grant?.token).toBeTruthy();
    expect(grant?.token).not.toBe("stub-token");
    expect(grant?.expiresAt).toBeGreaterThan(Date.now());
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
