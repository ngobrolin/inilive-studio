import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRoomPresence,
  getRoomPresence,
  registerRoomParticipant,
} from "./room-presence";

describe("room presence", () => {
  beforeEach(() => {
    clearRoomPresence();
  });

  it("tracks Host and Guest participants in ephemeral memory", () => {
    registerRoomParticipant({
      roomId: "demo",
      displayName: " Host ",
      role: "host",
      cameraEnabled: true,
      microphoneEnabled: false,
    });
    registerRoomParticipant({
      roomId: "demo",
      displayName: "Guest One",
      role: "guest",
      cameraEnabled: false,
      microphoneEnabled: true,
    });

    expect(getRoomPresence("demo").participants).toMatchObject([
      {
        displayName: "Host",
        role: "host",
        cameraEnabled: true,
        microphoneEnabled: false,
      },
      {
        displayName: "Guest One",
        role: "guest",
        cameraEnabled: false,
        microphoneEnabled: true,
      },
    ]);
  });

  it("keeps one Host per Room", () => {
    registerRoomParticipant({
      roomId: "demo",
      displayName: "First Host",
      role: "host",
      cameraEnabled: true,
      microphoneEnabled: true,
    });
    registerRoomParticipant({
      roomId: "demo",
      displayName: "Second Host",
      role: "host",
      cameraEnabled: false,
      microphoneEnabled: false,
    });

    expect(getRoomPresence("demo").participants).toMatchObject([
      {
        displayName: "Second Host",
        role: "host",
        cameraEnabled: false,
        microphoneEnabled: false,
      },
    ]);
  });

  it("blocks a fourth Guest", () => {
    for (const name of ["One", "Two", "Three"]) {
      registerRoomParticipant({
        roomId: "demo",
        displayName: name,
        role: "guest",
        cameraEnabled: true,
        microphoneEnabled: true,
      });
    }

    const result = registerRoomParticipant({
      roomId: "demo",
      displayName: "Four",
      role: "guest",
      cameraEnabled: true,
      microphoneEnabled: true,
    });

    expect(result.roomFull).toBe(true);
    expect(getRoomPresence("demo").participants).toHaveLength(3);
  });
});
