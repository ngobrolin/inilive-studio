import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearBroadcastState,
  getRoomBroadcastIngestGrant,
  startRoomBroadcast,
} from "$lib/server/broadcast-state";
import * as bridgeClient from "$lib/server/bridge-client";
import { POST } from "./+server";

describe("WHIP ingest endpoint", () => {
  beforeEach(() => {
    clearBroadcastState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    bridgeClient.clearBridgeClientConfig();
  });

  it("rejects missing or invalid bearer tokens before accepting ingest", async () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const ingestGrant = getRoomBroadcastIngestGrant("demo");

    await expect(postWhip("demo")).resolves.toMatchObject({ status: 401 });
    await expect(postWhip("demo", "Bearer wrong-token")).resolves.toMatchObject({ status: 401 });
    await expect(postWhip("demo", `Bearer ${ingestGrant?.bearerToken}`)).resolves.toMatchObject({
      status: 202,
    });
  });

  it("forwards valid WHIP ingest to the broadcast bridge", async () => {
    bridgeClient.configureBridgeClient({ enabled: true });
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const ingestGrant = getRoomBroadcastIngestGrant("demo");
    const forwardMock = vi.spyOn(bridgeClient, "forwardWhipIngest").mockResolvedValue(
      new Response("v=0\r\no=-", {
        status: 201,
        headers: {
          "Content-Type": "application/sdp",
          Location: "/whip/demo/resource",
        },
      }),
    );

    const response = await postWhip("demo", `Bearer ${ingestGrant?.bearerToken}`, "v=0\r\no=-");

    expect(forwardMock).toHaveBeenCalledWith({
      roomId: "demo",
      authorizationHeader: `Bearer ${ingestGrant?.bearerToken}`,
      body: "v=0\r\no=-",
      contentType: "application/sdp",
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("Location")).toBe("/whip/demo/resource");
  });
});

function postWhip(
  roomId: string,
  authorizationHeader?: string,
  body = "v=0",
): Promise<Response> {
  const headers = new Headers({ "Content-Type": "application/sdp" });
  if (authorizationHeader) {
    headers.set("Authorization", authorizationHeader);
  }

  return Promise.resolve(
    POST({
      params: { roomId },
      request: new Request(`http://localhost/whip/${roomId}`, {
        method: "POST",
        headers,
        body,
      }),
    } as never),
  );
}
