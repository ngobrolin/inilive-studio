import { describe, expect, it } from "vitest";
import { issueLiveKitMediaJoinGrant } from "./livekit-hub";

describe("LiveKit media join grants", () => {
  it("issues scoped tokens for each participant in the same Room", async () => {
    const credentials = {
      apiKey: "devkey",
      apiSecret: "secret",
      serverUrl: "wss://example.livekit.cloud",
    };

    const hostGrant = await issueLiveKitMediaJoinGrant({
      ...credentials,
      roomId: "demo",
      participantId: "participant-1",
      displayName: "Host One",
      role: "host",
    });
    const guestGrant = await issueLiveKitMediaJoinGrant({
      ...credentials,
      roomId: "demo",
      participantId: "participant-2",
      displayName: "Guest One",
      role: "guest",
    });

    expect(hostGrant).toMatchObject({
      roomName: "demo",
      participantIdentity: "participant-1",
      serverUrl: "wss://example.livekit.cloud",
      displayName: "Host One",
      role: "host",
    });
    expect(guestGrant).toMatchObject({
      roomName: "demo",
      participantIdentity: "participant-2",
      displayName: "Guest One",
      role: "guest",
    });
    expect(hostGrant.token).toBeTruthy();
    expect(guestGrant.token).toBeTruthy();
    expect(hostGrant.token).not.toBe(guestGrant.token);
  });
});
