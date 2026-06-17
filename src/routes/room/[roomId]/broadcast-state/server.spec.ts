import { beforeEach, describe, expect, it } from "vitest";
import {
  clearBroadcastState,
  getRoomBroadcastCallbackGrant,
  recordBridgeBroadcastHealth,
  startRoomBroadcast,
} from "$lib/server/broadcast-state";
import { clearRoomPresence, registerRoomParticipant } from "$lib/server/room-presence";
import { GET } from "./+server";

describe("Room Broadcast State endpoint", () => {
  beforeEach(() => {
    clearBroadcastState();
    clearRoomPresence();
  });

  it("returns Broadcast Health details to Hosts and sanitized Broadcast State to Guests", async () => {
    const host = registerRoomParticipant({
      roomId: "demo",
      role: "host",
      displayName: "Host One",
      microphoneEnabled: true,
      cameraEnabled: true,
    }).participant;
    const guest = registerRoomParticipant({
      roomId: "demo",
      role: "guest",
      displayName: "Guest One",
      microphoneEnabled: true,
      cameraEnabled: true,
    }).participant;
    if (!host || !guest) {
      throw new Error("Expected Host and Guest participants to enter the Room.");
    }
    startRoomBroadcast({
      roomId: "demo",
      hostParticipantId: host.id,
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
    });
    const callbackGrant = getRoomBroadcastCallbackGrant("demo");
    recordBridgeBroadcastHealth({
      roomId: "demo",
      authorizationHeader: `Bearer ${callbackGrant?.bearerToken}`,
      status: "degraded",
      message: "RTMP output is degraded.",
    });

    const hostResponse = await getBroadcastState("demo", host.id);
    const guestResponse = await getBroadcastState("demo", guest.id);

    await expect(hostResponse.json()).resolves.toMatchObject({
      state: "broadcasting",
      health: {
        status: "degraded",
        message: "RTMP output is degraded.",
      },
    });
    await expect(guestResponse.json()).resolves.toMatchObject({
      state: "broadcasting",
      health: null,
    });
  });
});

function getBroadcastState(roomId: string, participantId: string): Promise<Response> {
  return Promise.resolve(
    GET({
      params: { roomId },
      url: new URL(`http://localhost/room/${roomId}/broadcast-state?participant=${participantId}`),
    } as never),
  );
}
