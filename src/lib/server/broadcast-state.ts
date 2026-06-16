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

export type BroadcastIngestGrant = {
  whipUrl: string;
  bearerToken: string;
  expiresAt: number;
};

const broadcasts = new Map<string, RoomBroadcastRecord>();
const credentials = new Map<string, BroadcastCredentials>();
const ingestGrants = new Map<string, BroadcastIngestGrant>();
const INGEST_TOKEN_TTL_MS = 10 * 60 * 1000;

export function clearBroadcastState(): void {
  broadcasts.clear();
  credentials.clear();
  ingestGrants.clear();
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

export function getRoomBroadcastIngestGrant(roomId: string): BroadcastIngestGrant | null {
  return ingestGrants.get(roomId) ?? null;
}

export function authorizeWhipIngest(input: {
  roomId: string;
  authorizationHeader: string | null;
  now?: number;
}): { authorized: boolean; status: 202 | 401 } {
  const token = bearerTokenFrom(input.authorizationHeader);
  const ingestGrant = ingestGrants.get(input.roomId);
  const broadcast = broadcasts.get(input.roomId);
  const now = input.now ?? Date.now();

  if (
    !token ||
    !ingestGrant ||
    !broadcast ||
    broadcast.state !== "broadcasting" ||
    ingestGrant.expiresAt <= now ||
    token !== ingestGrant.bearerToken
  ) {
    return { authorized: false, status: 401 };
  }

  return { authorized: true, status: 202 };
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
  ingestGrants.set(input.roomId, {
    whipUrl: `/whip/${encodeURIComponent(input.roomId)}`,
    bearerToken: `whip_${globalThis.crypto.randomUUID().replaceAll("-", "")}`,
    expiresAt: Date.now() + INGEST_TOKEN_TTL_MS,
  });

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
  ingestGrants.delete(input.roomId);

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
  ingestGrants.delete(input.roomId);

  return { error: null };
}

function bearerTokenFrom(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;

  const match = authorizationHeader.trim().match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
