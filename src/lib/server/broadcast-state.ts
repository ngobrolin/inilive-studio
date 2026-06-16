export type BroadcastLifecycle = "backstage" | "broadcasting" | "ended" | "failed";

export type RoomBroadcastView = {
  state: BroadcastLifecycle;
  failureMessage: string | null;
};

type RoomBroadcastRecord = {
  state: BroadcastLifecycle;
  failureMessage: string | null;
  hostParticipantId: string | null;
};

type BroadcastCredentials = {
  rtmpServerUrl: string;
  streamKey: string;
};

const broadcasts = new Map<string, RoomBroadcastRecord>();
const credentials = new Map<string, BroadcastCredentials>();

export function clearBroadcastState(): void {
  broadcasts.clear();
  credentials.clear();
}

export function getRoomBroadcastView(roomId: string): RoomBroadcastView {
  const record = broadcasts.get(roomId);

  return {
    state: record?.state ?? "backstage",
    failureMessage: record?.failureMessage ?? null,
  };
}

export function getRoomBroadcastCredentials(roomId: string): BroadcastCredentials | null {
  return credentials.get(roomId) ?? null;
}

export function startRoomBroadcast(input: {
  roomId: string;
  hostParticipantId: string;
  rtmpServerUrl: string;
  streamKey: string;
}): { error: string | null } {
  const rtmpServerUrl = input.rtmpServerUrl.trim();
  const streamKey = input.streamKey.trim();

  if (!rtmpServerUrl) {
    return { error: "Enter the RTMP server URL before starting a Broadcast." };
  }

  if (!streamKey) {
    return { error: "Enter the stream key before starting a Broadcast." };
  }

  const current = getRoomBroadcastView(input.roomId);
  if (current.state === "broadcasting") {
    return { error: "A Broadcast is already active in this Room." };
  }

  broadcasts.set(input.roomId, {
    state: "broadcasting",
    failureMessage: null,
    hostParticipantId: input.hostParticipantId,
  });
  credentials.set(input.roomId, { rtmpServerUrl, streamKey });

  return { error: null };
}

export function endRoomBroadcast(input: { roomId: string; hostParticipantId: string }): {
  error: string | null;
} {
  const record = broadcasts.get(input.roomId);

  if (!record || record.state !== "broadcasting") {
    return { error: "No active Broadcast is running in this Room." };
  }

  if (record.hostParticipantId !== input.hostParticipantId) {
    return { error: "Only the Host can end the Broadcast." };
  }

  broadcasts.set(input.roomId, {
    ...record,
    state: "ended",
    failureMessage: null,
  });
  credentials.delete(input.roomId);

  return { error: null };
}

export function failRoomBroadcast(input: { roomId: string; failureMessage: string }): {
  error: string | null;
} {
  const record = broadcasts.get(input.roomId);
  const failureMessage = input.failureMessage.trim();

  if (!record || record.state !== "broadcasting") {
    return { error: "No active Broadcast is running in this Room." };
  }

  if (!failureMessage) {
    return { error: "A failure message is required." };
  }

  broadcasts.set(input.roomId, {
    ...record,
    state: "failed",
    failureMessage,
  });
  credentials.delete(input.roomId);

  return { error: null };
}
