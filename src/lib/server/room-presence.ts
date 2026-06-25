export type RoomRole = "host" | "guest";

export type RoomParticipant = {
  id: string;
  displayName: string;
  role: RoomRole;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  hostMutedMicrophone: boolean;
  hostDisabledCamera: boolean;
  unmuteRequested: boolean;
  removed: boolean;
};

export type RoomChatMessage = {
  id: string;
  senderDisplayName: string;
  senderRole: RoomRole;
  text: string;
};

export type RoomPresence = {
  roomId: string;
  participants: RoomParticipant[];
  full: boolean;
  activeScreenShare: RoomScreenShare | null;
};

export type RoomScreenShare = {
  participantId: string;
  displayName: string;
};

const MAX_GUESTS = 3;
const rooms = new Map<string, RoomParticipant[]>();
const roomMessages = new Map<string, RoomChatMessage[]>();
const roomScreenShares = new Map<string, RoomScreenShare>();
let participantSequence = 0;
let messageSequence = 0;

export function clearRoomPresence(): void {
  rooms.clear();
  roomMessages.clear();
  roomScreenShares.clear();
  participantSequence = 0;
  messageSequence = 0;
}

export function getRoomPresence(roomId: string): RoomPresence {
  const participants = rooms.get(roomId) ?? [];

  return {
    roomId,
    participants,
    full: guestCount(participants) >= MAX_GUESTS,
    activeScreenShare: roomScreenShares.get(roomId) ?? null,
  };
}

export function registerRoomParticipant(input: {
  roomId: string;
  displayName: string;
  role: RoomRole;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
}): { participant: RoomParticipant | null; roomFull: boolean } {
  const currentParticipants = rooms.get(input.roomId) ?? [];
  const participants =
    input.role === "host"
      ? currentParticipants.filter((participant) => participant.role !== "host")
      : currentParticipants;

  if (input.role === "guest" && guestCount(participants) >= MAX_GUESTS) {
    return { participant: null, roomFull: true };
  }

  const participant: RoomParticipant = {
    id: `participant-${++participantSequence}`,
    displayName: input.displayName.trim(),
    role: input.role,
    cameraEnabled: input.cameraEnabled,
    microphoneEnabled: input.microphoneEnabled,
    hostMutedMicrophone: false,
    hostDisabledCamera: false,
    unmuteRequested: false,
    removed: false,
  };

  rooms.set(input.roomId, [...participants, participant]);

  return { participant, roomFull: false };
}

export function getRoomChatMessages(roomId: string): RoomChatMessage[] {
  return roomMessages.get(roomId) ?? [];
}

export function postRoomChatMessage(input: {
  roomId: string;
  participantId: string;
  text: string;
}): { message: RoomChatMessage | null; error: string | null } {
  const participant = findRoomParticipant(input.roomId, input.participantId);
  const text = input.text.trim();

  if (!participant) {
    return { message: null, error: "Enter the Room before sending Room Chat messages." };
  }

  if (!text) {
    return { message: null, error: "Type a Room Chat message before sending." };
  }

  const message: RoomChatMessage = {
    id: `message-${++messageSequence}`,
    senderDisplayName: participant.displayName,
    senderRole: participant.role,
    text,
  };
  roomMessages.set(input.roomId, [...getRoomChatMessages(input.roomId), message]);

  return { message, error: null };
}

export function moderateRoomParticipant(input: {
  roomId: string;
  hostParticipantId: string;
  guestParticipantId: string;
  action: "force-mute" | "force-camera-off" | "request-unmute" | "remove";
}): { error: string | null } {
  const participants = getRoomPresence(input.roomId).participants;
  const host = participants.find(
    (participant) => participant.id === input.hostParticipantId && participant.role === "host",
  );
  const guest = participants.find(
    (participant) => participant.id === input.guestParticipantId && participant.role === "guest",
  );

  if (!host) {
    return { error: "Only the Host can moderate Guests." };
  }

  if (!guest) {
    return { error: "Choose a Guest in this Room." };
  }

  rooms.set(
    input.roomId,
    participants.map((participant) => {
      if (participant.id !== guest.id) return participant;

      if (input.action === "force-mute") {
        return { ...participant, microphoneEnabled: false, hostMutedMicrophone: true };
      }

      if (input.action === "force-camera-off") {
        return { ...participant, cameraEnabled: false, hostDisabledCamera: true };
      }

      if (input.action === "request-unmute") {
        return { ...participant, unmuteRequested: true };
      }

      return { ...participant, removed: true, microphoneEnabled: false, cameraEnabled: false };
    }),
  );

  return { error: null };
}

export function respondToHostUnmuteRequest(input: {
  roomId: string;
  participantId: string;
  accepted: boolean;
}): { error: string | null } {
  const participants = getRoomPresence(input.roomId).participants;
  const participant = participants.find((candidate) => candidate.id === input.participantId);

  if (!participant) {
    return { error: "Enter the Room before responding to Host requests." };
  }

  rooms.set(
    input.roomId,
    participants.map((candidate) => {
      if (candidate.id !== participant.id) return candidate;

      return {
        ...candidate,
        microphoneEnabled: input.accepted ? true : candidate.microphoneEnabled,
        hostMutedMicrophone: input.accepted ? false : candidate.hostMutedMicrophone,
        unmuteRequested: false,
      };
    }),
  );

  return { error: null };
}

export function startRoomScreenShare(input: {
  roomId: string;
  participantId: string;
}): { error: string | null } {
  const participant = findRoomParticipant(input.roomId, input.participantId);

  if (!participant || participant.role !== "host") {
    return { error: "Only the Host can start Screen Share." };
  }

  const activeScreenShare = roomScreenShares.get(input.roomId);
  if (activeScreenShare && activeScreenShare.participantId !== participant.id) {
    return { error: "A Screen Share is already active in this Room." };
  }

  roomScreenShares.set(input.roomId, {
    participantId: participant.id,
    displayName: participant.displayName,
  });

  return { error: null };
}

export function stopRoomScreenShare(input: {
  roomId: string;
  participantId: string;
}): { error: string | null } {
  const activeScreenShare = roomScreenShares.get(input.roomId);

  if (!activeScreenShare) {
    return { error: null };
  }

  if (activeScreenShare.participantId !== input.participantId) {
    return { error: "Only the active Screen Share Host can stop Screen Share." };
  }

  roomScreenShares.delete(input.roomId);

  return { error: null };
}

export function clearRoomScreenShare(roomId: string): void {
  roomScreenShares.delete(roomId);
}

function findRoomParticipant(roomId: string, participantId: string): RoomParticipant | undefined {
  return getRoomPresence(roomId).participants.find(
    (participant) => participant.id === participantId,
  );
}

function guestCount(participants: RoomParticipant[]): number {
  return participants.filter((participant) => participant.role === "guest").length;
}
