import { beforeEach, describe, expect, it } from "vitest";
import {
  authorizeWhipIngest,
  clearBroadcastState,
  endRoomBroadcast,
  failRoomBroadcast,
  getRoomBroadcastCallbackGrant,
  getRoomBroadcastCredentials,
  getRoomBroadcastIngestGrant,
  getRoomBroadcastView,
  recordBridgeBroadcastHealth,
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

  it("exposes the managed YouTube event links without exposing ingest credentials", () => {
    const result = startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
      youtubeBroadcastId: "youtube-broadcast-1",
    });

    expect(result.error).toBeNull();
    expect(getRoomBroadcastView("demo")).toMatchObject({
      youtubeWatchUrl: "https://www.youtube.com/watch?v=youtube-broadcast-1",
      youtubeControlRoomUrl: "https://studio.youtube.com/video/youtube-broadcast-1/livestreaming",
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

  it("issues a callback grant without exposing callback tokens in the room view", () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const callbackGrant = getRoomBroadcastCallbackGrant("demo");

    expect(callbackGrant?.callbackUrl).toBe("/bridge/demo/events");
    expect(callbackGrant?.bearerToken).toMatch(/^bridge_/);
    expect(callbackGrant?.expiresAt).toBeGreaterThan(Date.now());
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

  it("records bridge health transitions and hides detailed health from Guest views", () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const callbackGrant = getRoomBroadcastCallbackGrant("demo");

    const connected = recordBridgeBroadcastHealth({
      roomId: "demo",
      authorizationHeader: `Bearer ${callbackGrant?.bearerToken}`,
      status: "connected",
      message: "Broadcast Bridge is connected.",
    });
    const degraded = recordBridgeBroadcastHealth({
      roomId: "demo",
      authorizationHeader: `Bearer ${callbackGrant?.bearerToken}`,
      status: "degraded",
      message: "RTMP output is degraded.",
    });

    expect(connected.error).toBeNull();
    expect(degraded.error).toBeNull();
    expect(getRoomBroadcastView("demo")).toMatchObject({
      state: "broadcasting",
      health: {
        status: "degraded",
        message: "RTMP output is degraded.",
      },
    });
    expect(getRoomBroadcastView("demo", { includeHealth: false })).toMatchObject({
      state: "broadcasting",
      health: null,
    });
    expect(getRoomBroadcastCredentials("demo")).not.toBeNull();
  });

  it("accepts bridge terminal ended callbacks and clears active secrets", () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const callbackGrant = getRoomBroadcastCallbackGrant("demo");

    const result = recordBridgeBroadcastHealth({
      roomId: "demo",
      authorizationHeader: `Bearer ${callbackGrant?.bearerToken}`,
      status: "ended",
      message: "Broadcast Bridge ended the Broadcast.",
    });

    expect(result.error).toBeNull();
    expect(getRoomBroadcastView("demo")).toMatchObject({
      state: "ended",
      health: {
        status: "ended",
        message: "Broadcast Bridge ended the Broadcast.",
      },
    });
    expect(getRoomBroadcastCredentials("demo")).toBeNull();
    expect(getRoomBroadcastIngestGrant("demo")).toBeNull();
    expect(getRoomBroadcastCallbackGrant("demo")).toBeNull();
  });
});
