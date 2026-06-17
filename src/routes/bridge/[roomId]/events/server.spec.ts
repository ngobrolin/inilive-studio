import { beforeEach, describe, expect, it } from "vitest";
import {
  clearBroadcastState,
  getRoomBroadcastCallbackGrant,
  getRoomBroadcastView,
  startRoomBroadcast,
} from "$lib/server/broadcast-state";
import { POST } from "./+server";

describe("bridge Broadcast Health callback endpoint", () => {
  beforeEach(() => {
    clearBroadcastState();
  });

  it("accepts authenticated bridge failure callbacks for an active Broadcast", async () => {
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: "participant-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const callbackGrant = getRoomBroadcastCallbackGrant("demo");

    await expect(postBridgeEvent("demo", null, { status: "failed" })).resolves.toMatchObject({
      status: 401,
    });

    const response = await postBridgeEvent("demo", `Bearer ${callbackGrant?.bearerToken}`, {
      status: "failed",
      message: "RTMP output disconnected.",
    });

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
});

function postBridgeEvent(
  roomId: string,
  authorizationHeader: string | null,
  body: unknown,
): Promise<Response> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (authorizationHeader) {
    headers.set("Authorization", authorizationHeader);
  }

  return Promise.resolve(
    POST({
      params: { roomId },
      request: new Request(`http://localhost/bridge/${roomId}/events`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
    } as never),
  );
}
