import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRoomPresence,
  getRoomChatMessages,
  getRoomPresence,
  moderateRoomParticipant,
  postRoomChatMessage,
  registerRoomParticipant,
  respondToHostUnmuteRequest,
  startRoomScreenShare,
  stopRoomScreenShare,
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

  it("clears Room Chat history with ephemeral Room state", () => {
    const { participant } = registerRoomParticipant({
      roomId: "demo",
      displayName: "Host",
      role: "host",
      cameraEnabled: true,
      microphoneEnabled: true,
    });

    postRoomChatMessage({
      roomId: "demo",
      participantId: participant?.id ?? "",
      text: "This message is not persisted",
    });
    clearRoomPresence();

    expect(getRoomChatMessages("demo")).toEqual([]);
  });

  it("lets the Host force-mute and force-camera-off a Guest", () => {
    const { participant: host } = registerRoomParticipant({
      roomId: "demo",
      displayName: "Host",
      role: "host",
      cameraEnabled: true,
      microphoneEnabled: true,
    });
    const { participant: guest } = registerRoomParticipant({
      roomId: "demo",
      displayName: "Guest",
      role: "guest",
      cameraEnabled: true,
      microphoneEnabled: true,
    });

    moderateRoomParticipant({
      roomId: "demo",
      hostParticipantId: host?.id ?? "",
      guestParticipantId: guest?.id ?? "",
      action: "force-mute",
    });
    moderateRoomParticipant({
      roomId: "demo",
      hostParticipantId: host?.id ?? "",
      guestParticipantId: guest?.id ?? "",
      action: "force-camera-off",
    });

    expect(getRoomPresence("demo").participants.at(1)).toMatchObject({
      microphoneEnabled: false,
      cameraEnabled: false,
      hostMutedMicrophone: true,
      hostDisabledCamera: true,
    });
  });

  it("lets a Guest accept a Host unmute request", () => {
    const { participant: host } = registerRoomParticipant({
      roomId: "demo",
      displayName: "Host",
      role: "host",
      cameraEnabled: true,
      microphoneEnabled: true,
    });
    const { participant: guest } = registerRoomParticipant({
      roomId: "demo",
      displayName: "Guest",
      role: "guest",
      cameraEnabled: true,
      microphoneEnabled: false,
    });

    moderateRoomParticipant({
      roomId: "demo",
      hostParticipantId: host?.id ?? "",
      guestParticipantId: guest?.id ?? "",
      action: "request-unmute",
    });
    respondToHostUnmuteRequest({
      roomId: "demo",
      participantId: guest?.id ?? "",
      accepted: true,
    });

    expect(getRoomPresence("demo").participants.at(1)).toMatchObject({
      microphoneEnabled: true,
      unmuteRequested: false,
    });
  });

  it("lets the Host remove a Guest from the current Room session", () => {
    const { participant: host } = registerRoomParticipant({
      roomId: "demo",
      displayName: "Host",
      role: "host",
      cameraEnabled: true,
      microphoneEnabled: true,
    });
    const { participant: guest } = registerRoomParticipant({
      roomId: "demo",
      displayName: "Guest",
      role: "guest",
      cameraEnabled: true,
      microphoneEnabled: true,
    });

    moderateRoomParticipant({
      roomId: "demo",
      hostParticipantId: host?.id ?? "",
      guestParticipantId: guest?.id ?? "",
      action: "remove",
    });

    expect(getRoomPresence("demo").participants.at(1)).toMatchObject({
      removed: true,
      microphoneEnabled: false,
      cameraEnabled: false,
    });
  });

  it("lets only the Host start and stop one active Screen Share", () => {
    const { participant: host } = registerRoomParticipant({
      roomId: "demo",
      displayName: "Host",
      role: "host",
      cameraEnabled: true,
      microphoneEnabled: true,
    });
    const { participant: guest } = registerRoomParticipant({
      roomId: "demo",
      displayName: "Guest",
      role: "guest",
      cameraEnabled: true,
      microphoneEnabled: true,
    });

    expect(
      startRoomScreenShare({ roomId: "demo", participantId: guest?.id ?? "" }).error,
    ).toBe("Only the Host can start Screen Share.");

    startRoomScreenShare({ roomId: "demo", participantId: host?.id ?? "" });
    startRoomScreenShare({ roomId: "demo", participantId: host?.id ?? "" });

    expect(getRoomPresence("demo").activeScreenShare).toEqual({
      participantId: host?.id,
      displayName: "Host",
    });

    expect(
      stopRoomScreenShare({ roomId: "demo", participantId: guest?.id ?? "" }).error,
    ).toBe("Only the active Screen Share Host can stop Screen Share.");

    stopRoomScreenShare({ roomId: "demo", participantId: host?.id ?? "" });

    expect(getRoomPresence("demo").activeScreenShare).toBeNull();
  });
});
