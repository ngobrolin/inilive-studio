import { beforeEach, describe, expect, it, vi } from "vitest";
import { refreshActiveParticipantMediaGrant } from "$lib/server/media-join";
import { clearRoomPresence, registerRoomParticipant } from "$lib/server/room-presence";
import { GET } from "./+server";

vi.mock("$lib/server/media-join", async () => {
  const actual = await vi.importActual<typeof import("$lib/server/media-join")>(
    "$lib/server/media-join",
  );
  return {
    ...actual,
    refreshActiveParticipantMediaGrant: vi.fn(actual.refreshActiveParticipantMediaGrant),
  };
});

describe("Room media token refresh endpoint", () => {
  beforeEach(() => {
    clearRoomPresence();
    vi.mocked(refreshActiveParticipantMediaGrant).mockReset();
  });

  it("returns a refreshed LiveKit grant for an active participant", async () => {
    const participant = registerRoomParticipant({
      roomId: "demo",
      role: "host",
      displayName: "Host One",
      microphoneEnabled: true,
      cameraEnabled: true,
    }).participant;
    if (!participant) {
      throw new Error("Expected Host participant to enter the Room.");
    }

    vi.mocked(refreshActiveParticipantMediaGrant).mockResolvedValue({
      provider: "livekit",
      stub: false,
      roomName: "demo",
      participantIdentity: participant.id,
      token: "fresh-token",
      serverUrl: "wss://example.livekit.cloud",
      displayName: "Host One",
      role: "host",
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    const response = await getMediaToken("demo", participant.id);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      token: "fresh-token",
      serverUrl: "wss://example.livekit.cloud",
      expiresAt: expect.any(Number),
      participantIdentity: participant.id,
      displayName: "Host One",
      role: "host",
      roomName: "demo",
    });
  });

  it("rejects refresh requests for unknown participants", async () => {
    vi.mocked(refreshActiveParticipantMediaGrant).mockResolvedValue(null);

    const response = await getMediaToken("demo", "missing-participant");

    expect(response.status).toBe(404);
  });
});

function getMediaToken(roomId: string, participantId: string): Promise<Response> {
  return Promise.resolve(
    GET({
      params: { roomId },
      url: new URL(`http://localhost/room/${roomId}/media-token?participant=${participantId}`),
    } as never),
  );
}
