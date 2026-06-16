import { beforeEach, describe, expect, it } from "vitest";
import {
  authorizeWhipIngest,
  clearBroadcastState,
  endRoomBroadcast,
  failRoomBroadcast,
  getRoomBroadcastCredentials,
  getRoomBroadcastIngestGrant,
  getRoomBroadcastView,
  startRoomBroadcast,
} from "./broadcast-state";

describe("broadcast state", () => {
  beforeEach(() => {
    clearBroadcastState();
  });

  it("starts Broadcasting with ephemeral credentials that stay out of the public view", () => {
    const result = startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });

    expect(result.error).toBeNull();
    expect(getRoomBroadcastView("demo")).toMatchObject({
      state: "broadcasting",
      failureMessage: null,
    });
    expect(getRoomBroadcastCredentials("demo")).toMatchObject({
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    expect(getRoomBroadcastView("demo")).not.toHaveProperty("streamKey");
    expect(getRoomBroadcastView("demo")).not.toHaveProperty("rtmpServerUrl");
  });

  it("issues a short-lived WHIP ingest grant for the current Broadcast attempt", () => {
    const result = startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });

    const ingestGrant = getRoomBroadcastIngestGrant("demo");

    expect(result.error).toBeNull();
    expect(ingestGrant?.whipUrl).toBe("/whip/demo");
    expect(ingestGrant?.bearerToken).toMatch(/^whip_/);
    expect(ingestGrant?.expiresAt).toBeGreaterThan(Date.now());
    expect(getRoomBroadcastView("demo")).not.toHaveProperty("bearerToken");
  });

  it("authorizes WHIP ingest only with the current bearer token", () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const ingestGrant = getRoomBroadcastIngestGrant("demo");

    expect(authorizeWhipIngest({ roomId: "demo", authorizationHeader: null })).toEqual({
      authorized: false,
      status: 401,
    });
    expect(
      authorizeWhipIngest({ roomId: "demo", authorizationHeader: "Bearer wrong-token" }),
    ).toEqual({
      authorized: false,
      status: 401,
    });
    expect(
      authorizeWhipIngest({
        roomId: "demo",
        authorizationHeader: `Bearer ${ingestGrant?.bearerToken}`,
      }),
    ).toEqual({
      authorized: true,
      status: 202,
    });
  });

  it("expires WHIP ingest tokens", () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const ingestGrant = getRoomBroadcastIngestGrant("demo");

    expect(
      authorizeWhipIngest({
        roomId: "demo",
        authorizationHeader: `Bearer ${ingestGrant?.bearerToken}`,
        now: ingestGrant?.expiresAt,
      }),
    ).toEqual({
      authorized: false,
      status: 401,
    });
  });

  it("scopes WHIP ingest tokens to one Broadcast attempt", () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const firstToken = getRoomBroadcastIngestGrant("demo")?.bearerToken;

    endRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
    });
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "new-stream-key",
    });
    const nextToken = getRoomBroadcastIngestGrant("demo")?.bearerToken;

    expect(nextToken).not.toBe(firstToken);
    expect(
      authorizeWhipIngest({ roomId: "demo", authorizationHeader: `Bearer ${firstToken}` }),
    ).toEqual({
      authorized: false,
      status: 401,
    });
    expect(
      authorizeWhipIngest({ roomId: "demo", authorizationHeader: `Bearer ${nextToken}` }),
    ).toEqual({
      authorized: true,
      status: 202,
    });
  });

  it("ends Broadcasting, clears credentials, and exposes the Ended state", () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });

    const result = endRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
    });

    expect(result.error).toBeNull();
    expect(getRoomBroadcastView("demo")).toMatchObject({
      state: "ended",
      failureMessage: null,
    });
    expect(getRoomBroadcastCredentials("demo")).toBeNull();
  });

  it("reports Failed, clears credentials, and allows the Host to start a new Broadcast", () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });

    const failed = failRoomBroadcast({
      roomId: "demo",
      failureMessage: "YouTube rejected the stream credentials.",
    });

    expect(failed.error).toBeNull();
    expect(getRoomBroadcastView("demo")).toMatchObject({
      state: "failed",
      failureMessage: "YouTube rejected the stream credentials.",
    });
    expect(getRoomBroadcastCredentials("demo")).toBeNull();

    const retry = startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "new-stream-key",
    });

    expect(retry.error).toBeNull();
    expect(getRoomBroadcastView("demo").state).toBe("broadcasting");
  });
});
