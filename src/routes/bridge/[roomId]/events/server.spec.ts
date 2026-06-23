import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearBroadcastState,
  endRoomBroadcast,
  getRoomBroadcastCallbackGrant,
  getRoomBroadcastView,
  startRoomBroadcast,
} from "$lib/server/broadcast-state";
import { configureBridgeCallbackHmacSecret } from "$lib/server/health/callback-secret";
import { createInMemoryHealthEventStore } from "$lib/server/health/store";
import { setHealthEventStoreForTests, clearHealthEventStoreForTests } from "$lib/server/health/runtime";
import { buildBridgeHealthSignatureHeader } from "$lib/server/health/signatures";
import { createInMemoryBroadcastStore } from "$lib/server/broadcasts/store";
import {
  clearBroadcastStoreForTests,
  setBroadcastStoreForTests,
} from "$lib/server/broadcasts/runtime";
import { createInMemoryYouTubeStore } from "$lib/server/youtube/store";
import { clearYouTubeRuntimeForTests, setYouTubeRuntimeForTests } from "$lib/server/youtube/runtime";
import { setRoomManagedYouTubeBroadcast } from "$lib/server/broadcast-state";
import { POST } from "./+server";

describe("bridge Broadcast Health callback endpoint", () => {
  const hmacSecret = "test-bridge-hmac-secret";

  beforeEach(() => {
    clearBroadcastState();
    clearHealthEventStoreForTests();
    clearBroadcastStoreForTests();
    clearYouTubeRuntimeForTests();
    configureBridgeCallbackHmacSecret(hmacSecret);
    setHealthEventStoreForTests(createInMemoryHealthEventStore());
    setBroadcastStoreForTests(createInMemoryBroadcastStore());
  });

  it("accepts authenticated bridge failure callbacks for an active Broadcast", async () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
      productBroadcastId: "broadcast-42",
    });
    const callbackGrant = getRoomBroadcastCallbackGrant("demo");

    await expect(postBridgeEvent("demo", null, { status: "failed" })).resolves.toMatchObject({
      status: 401,
    });

    const response = await postBridgeEvent(
      "demo",
      `Bearer ${callbackGrant?.bearerToken}`,
      {
        status: "failed",
        message: "RTMP output disconnected.",
      },
      hmacSecret,
    );

    expect(response.status).toBe(202);
    expect(getRoomBroadcastView("demo")).toMatchObject({
      state: "failed",
      failureMessage: "RTMP output disconnected.",
      health: {
        status: "failed",
        message: "RTMP output disconnected.",
      },
    });
  });

  it("rejects bridge callbacks with invalid HMAC signatures", async () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const callbackGrant = getRoomBroadcastCallbackGrant("demo");

    const response = await postBridgeEvent(
      "demo",
      `Bearer ${callbackGrant?.bearerToken}`,
      { status: "connected", message: "Connected." },
      "wrong-secret",
    );

    expect(response.status).toBe(401);
  });

  it("persists Broadcast Health events for product Broadcasts", async () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
      productBroadcastId: "broadcast-42",
    });
    const callbackGrant = getRoomBroadcastCallbackGrant("demo");

    const response = await postBridgeEvent(
      "demo",
      `Bearer ${callbackGrant?.bearerToken}`,
      { status: "degraded", message: "RTMP output is degraded." },
      hmacSecret,
    );

    expect(response.status).toBe(202);

    const { getHealthEventStore } = await import("$lib/server/health/runtime");
    const events = await getHealthEventStore().listEventsForBroadcast("broadcast-42");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      status: "degraded",
      message: "RTMP output is degraded.",
    });
    expect(JSON.stringify(events[0]?.payload)).not.toContain("secret-stream-key");
  });

  it("accepts and persists the bridge ended callback after the Host ends a Broadcast", async () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
      productBroadcastId: "broadcast-42",
    });
    const callbackGrant = getRoomBroadcastCallbackGrant("demo");

    const endResult = endRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
    });
    expect(endResult.error).toBeNull();

    const response = await postBridgeEvent(
      "demo",
      `Bearer ${callbackGrant?.bearerToken}`,
      {
        status: "ended",
        message: "Broadcast Bridge ended the Broadcast.",
      },
      hmacSecret,
    );

    expect(response.status).toBe(202);
    const { getHealthEventStore } = await import("$lib/server/health/runtime");
    const events = await getHealthEventStore().listEventsForBroadcast("broadcast-42");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      status: "ended",
      message: "Broadcast Bridge ended the Broadcast.",
    });
    expect(getRoomBroadcastCallbackGrant("demo")).toBeNull();
  });

  it("maps managed YouTube live transition failures to Broadcast Health and product Failed state", async () => {
    const broadcastStore = createInMemoryBroadcastStore();
    setBroadcastStoreForTests(broadcastStore);
    const productBroadcast = await broadcastStore.createCountdownBroadcast("demo", new Date(1_000));
    await broadcastStore.markBroadcastBroadcasting(productBroadcast.id, new Date(1_000));
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
      productBroadcastId: productBroadcast.id,
      youtubeBroadcastId: "youtube-broadcast-1",
    });
    setRoomManagedYouTubeBroadcast("demo", {
      hostAccountId: "host-1",
      youtubeBroadcastId: "youtube-broadcast-1",
      youtubeStreamId: "youtube-stream-1",
    });
    const youtubeStore = createInMemoryYouTubeStore();
    await youtubeStore.saveChannelLink({
      hostAccountId: "host-1",
      youtubeChannelId: "channel-1",
      youtubeChannelTitle: "Linked Channel",
      refreshTokenCiphertext: "encrypted-refresh-token",
    });
    setYouTubeRuntimeForTests({
      store: youtubeStore,
      decryptRefreshToken: () => "stored-refresh-token",
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Linked Channel" }),
        refreshAccessToken: async () => "fresh-access-token",
        revokeToken: async () => undefined,
        getLiveStreamStatus: vi.fn(async () => "active"),
        getLiveBroadcastLifeCycleStatus: vi.fn(async () => {
          throw new Error("YouTube quota exhausted");
        }),
      },
    });
    const callbackGrant = getRoomBroadcastCallbackGrant("demo");

    const response = await postBridgeEvent(
      "demo",
      `Bearer ${callbackGrant?.bearerToken}`,
      { status: "connected", message: "RTMP ingest connected." },
      hmacSecret,
    );

    expect(response.status).toBe(202);
    expect(getRoomBroadcastView("demo")).toMatchObject({
      state: "failed",
      failureMessage: "YouTube did not transition the managed Broadcast to live.",
      health: {
        status: "failed",
        message: "YouTube did not transition the managed Broadcast to live.",
      },
    });
    await expect(broadcastStore.getBroadcastById(productBroadcast.id)).resolves.toMatchObject({
      state: "failed",
      failureMessage: "YouTube did not transition the managed Broadcast to live.",
      youtubeBroadcastId: null,
    });
    const { getHealthEventStore } = await import("$lib/server/health/runtime");
    const events = await getHealthEventStore().listEventsForBroadcast(productBroadcast.id);
    expect(events.map((event) => event.status)).toEqual(["connected", "failed"]);
  });
});

function postBridgeEvent(
  roomId: string,
  authorizationHeader: string | null,
  body: unknown,
  hmacSecret = "test-bridge-hmac-secret",
): Promise<Response> {
  const rawBody = JSON.stringify(body);
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-Bridge-Signature": buildBridgeHealthSignatureHeader(rawBody, hmacSecret),
  });
  if (authorizationHeader) {
    headers.set("Authorization", authorizationHeader);
  }

  return Promise.resolve(
    POST({
      params: { roomId },
      request: new Request(`http://localhost/bridge/${roomId}/events`, {
        method: "POST",
        headers,
        body: rawBody,
      }),
    } as never),
  );
}
