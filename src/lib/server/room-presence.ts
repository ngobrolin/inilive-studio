export type RoomRole = "host" | "guest";

export type RoomParticipant = {
  id: string;
  displayName: string;
  role: RoomRole;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
};

export type RoomPresence = {
  roomId: string;
  participants: RoomParticipant[];
  full: boolean;
};

const MAX_GUESTS = 3;
const rooms = new Map<string, RoomParticipant[]>();
let participantSequence = 0;

export function clearRoomPresence(): void {
  rooms.clear();
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

function guestCount(participants: RoomParticipant[]): number {
  return participants.filter((participant) => participant.role === "guest").length;
}
