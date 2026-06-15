import { describe, expect, it } from "vitest";
import {
  applyRemoteEvent,
  emptyRemoteParticipants,
  listRemoteTiles,
  type RemoteParticipantsState,
} from "./remote-participants";

function reduce(
  events: Parameters<typeof applyRemoteEvent>[1][],
): RemoteParticipantsState {
  return events.reduce(applyRemoteEvent, emptyRemoteParticipants());
}

describe("remote participant tiles", () => {
  it("adds a connected participant with camera and mic off", () => {
    const state = reduce([
      { type: "connected", identity: "p1", name: "Guest One" },
    ]);

    expect(listRemoteTiles(state)).toEqual([
      { identity: "p1", name: "Guest One", cameraOn: false, microphoneOn: false },
    ]);
  });

  it("turns camera and microphone on when their tracks are subscribed", () => {
    const state = reduce([
      { type: "connected", identity: "p1", name: "Guest One" },
      { type: "trackOn", identity: "p1", name: "Guest One", kind: "camera" },
      { type: "trackOn", identity: "p1", name: "Guest One", kind: "microphone" },
    ]);

    expect(listRemoteTiles(state)).toEqual([
      { identity: "p1", name: "Guest One", cameraOn: true, microphoneOn: true },
    ]);
  });

  it("represents a camera-off participant by name once the camera track stops", () => {
    const state = reduce([
      { type: "trackOn", identity: "p1", name: "Guest One", kind: "camera" },
      { type: "trackOff", identity: "p1", kind: "camera" },
    ]);

    expect(listRemoteTiles(state)).toEqual([
      { identity: "p1", name: "Guest One", cameraOn: false, microphoneOn: false },
    ]);
  });

  it("creates a tile from a track event before an explicit connect event", () => {
    const state = reduce([
      { type: "trackOn", identity: "p1", name: "Guest One", kind: "microphone" },
    ]);

    expect(listRemoteTiles(state)).toEqual([
      { identity: "p1", name: "Guest One", cameraOn: false, microphoneOn: true },
    ]);
  });

  it("removes a participant when they disconnect", () => {
    const state = reduce([
      { type: "connected", identity: "p1", name: "Guest One" },
      { type: "connected", identity: "p2", name: "Guest Two" },
      { type: "disconnected", identity: "p1" },
    ]);

    expect(listRemoteTiles(state)).toEqual([
      { identity: "p2", name: "Guest Two", cameraOn: false, microphoneOn: false },
    ]);
  });

  it("does not mutate the previous state", () => {
    const initial = emptyRemoteParticipants();
    const next = applyRemoteEvent(initial, {
      type: "connected",
      identity: "p1",
      name: "Guest One",
    });

    expect(initial.size).toBe(0);
    expect(next.size).toBe(1);
  });
});
