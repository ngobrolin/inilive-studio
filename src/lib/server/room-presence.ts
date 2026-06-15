export type RoomRole = "host" | "guest";

export type RoomParticipant = {
  id: string;
  displayName: string;
  role: RoomRole;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
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
};

const MAX_GUESTS = 3;
const rooms = new Map<string, RoomParticipant[]>();
const roomMessages = new Map<string, RoomChatMessage[]>();
let participantSequence = 0;
let messageSequence = 0;

export function clearRoomPresence(): void {
  rooms.clear();
  roomMessages.clear();
  participantSequence = 0;
  messageSequence = 0;
}

export function getRoomPresence(roomId: string): RoomPresence {
  const participants = rooms.get(roomId) ?? [];

  return {
    roomId,
    participants,
    full: guestCount(participants) >= MAX_GUESTS,
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

function findRoomParticipant(roomId: string, participantId: string): RoomParticipant | undefined {
  return getRoomPresence(roomId).participants.find((participant) => participant.id === participantId);
}

function guestCount(participants: RoomParticipant[]): number {
  return participants.filter((participant) => participant.role === "guest").length;
}
