import { describe, expect, it } from "vitest";
import {
  LIVEKIT_JOIN_GRANT_TTL,
  issueLiveKitMediaJoinGrant,
  parseLiveKitTtlMs,
} from "./livekit-hub";

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

  it("uses a six-hour grant TTL for long-running broadcasts", () => {
    expect(LIVEKIT_JOIN_GRANT_TTL).toBe("6h");
    expect(parseLiveKitTtlMs(LIVEKIT_JOIN_GRANT_TTL)).toBe(6 * 60 * 60 * 1000);
  });

  it("includes an expiresAt timestamp aligned with the configured TTL", async () => {
    const now = 1_700_000_000_000;
    const grant = await issueLiveKitMediaJoinGrant(
      {
        apiKey: "devkey",
        apiSecret: "secret",
        serverUrl: "wss://example.livekit.cloud",
        roomId: "demo",
        participantId: "participant-1",
        displayName: "Host One",
        role: "host",
      },
      { now },
    );

    expect(grant.expiresAt).toBe(now + parseLiveKitTtlMs(LIVEKIT_JOIN_GRANT_TTL));
  });
});
