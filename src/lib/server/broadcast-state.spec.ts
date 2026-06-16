import { beforeEach, describe, expect, it } from "vitest";
import {
  clearBroadcastState,
  endRoomBroadcast,
  failRoomBroadcast,
  getRoomBroadcastCredentials,
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
