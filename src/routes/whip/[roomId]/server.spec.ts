import { beforeEach, describe, expect, it } from "vitest";
import {
  clearBroadcastState,
  getRoomBroadcastIngestGrant,
  startRoomBroadcast,
} from "$lib/server/broadcast-state";
import { POST } from "./+server";

describe("WHIP ingest endpoint", () => {
  beforeEach(() => {
    clearBroadcastState();
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
});

function postWhip(roomId: string, authorizationHeader?: string): Promise<Response> {
  const headers = new Headers();
  if (authorizationHeader) {
    headers.set("Authorization", authorizationHeader);
  }

  return Promise.resolve(
    POST({
      params: { roomId },
      request: new Request(`http://localhost/whip/${roomId}`, {
        method: "POST",
        headers,
        body: "v=0",
      }),
    } as never),
  );
}
