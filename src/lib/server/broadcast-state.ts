export type BroadcastLifecycle = "backstage" | "countdown" | "broadcasting" | "ended" | "failed";
export type BroadcastHealthStatus = "connecting" | "connected" | "degraded" | "ended" | "failed";

export type RoomBroadcastView = {
  state: BroadcastLifecycle;
  failureMessage: string | null;
  health: BroadcastHealthView | null;
  countdownEndsAt: number | null;
  productBroadcastId: string | null;
};

type RoomBroadcastRecord = {
  state: BroadcastLifecycle;
  failureMessage: string | null;
  hostParticipantId: string | null;
  health: BroadcastHealthView | null;
  countdownEndsAt: number | null;
  productBroadcastId: string | null;
};

type BroadcastCredentials = {
  rtmpServerUrl: string;
  streamKey: string;
};

type PendingBroadcastAttempt = BroadcastCredentials & {
  hostParticipantId: string;
};

export type BroadcastIngestGrant = {
  whipUrl: string;
  bearerToken: string;
  expiresAt: number;
};

export type BroadcastCallbackGrant = {
  callbackUrl: string;
  bearerToken: string;
  expiresAt: number;
};

export type BroadcastHealthView = {
  status: BroadcastHealthStatus;
  message: string;
  updatedAt: number;
};

const broadcasts = new Map<string, RoomBroadcastRecord>();
const credentials = new Map<string, BroadcastCredentials>();
const pendingBroadcastAttempts = new Map<string, PendingBroadcastAttempt>();
const ingestGrants = new Map<string, BroadcastIngestGrant>();
const callbackGrants = new Map<string, BroadcastCallbackGrant>();
const INGEST_TOKEN_TTL_MS = 10 * 60 * 1000;
const CALLBACK_TOKEN_TTL_MS = 10 * 60 * 1000;

export function clearBroadcastState(): void {
  broadcasts.clear();
  credentials.clear();
  pendingBroadcastAttempts.clear();
  ingestGrants.clear();
  callbackGrants.clear();
}

export function getRoomBroadcastView(
  roomId: string,
  options: { includeHealth?: boolean } = {},
): RoomBroadcastView {
  const record = broadcasts.get(roomId);
  const includeHealth = options.includeHealth ?? true;

  return {
    state: record?.state ?? "backstage",
    failureMessage: record?.failureMessage ?? null,
    health: includeHealth ? (record?.health ?? null) : null,
    countdownEndsAt: record?.countdownEndsAt ?? null,
    productBroadcastId: record?.productBroadcastId ?? null,
  };
}

export function getRoomBroadcastCredentials(roomId: string): BroadcastCredentials | null {
  return credentials.get(roomId) ?? null;
}

export function getRoomBroadcastIngestGrant(roomId: string): BroadcastIngestGrant | null {
  return ingestGrants.get(roomId) ?? null;
}

export function getRoomBroadcastCallbackGrant(roomId: string): BroadcastCallbackGrant | null {
  return callbackGrants.get(roomId) ?? null;
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

export function recordBridgeBroadcastHealth(input: {
  roomId: string;
  authorizationHeader: string | null;
  status: BroadcastHealthStatus;
  message?: string;
  now?: number;
}): { error: string | null; status: 202 | 400 | 401 | 409 } {
  const token = bearerTokenFrom(input.authorizationHeader);
  const callbackGrant = callbackGrants.get(input.roomId);
  const record = broadcasts.get(input.roomId);
  const now = input.now ?? Date.now();

  if (
    !token ||
    !callbackGrant ||
    callbackGrant.expiresAt <= now ||
    token !== callbackGrant.bearerToken
  ) {
    return { error: "Unauthorized", status: 401 };
  }

  const confirmsHostEndedBroadcast = input.status === "ended" && record?.state === "ended";

  if (!record || (record.state !== "broadcasting" && !confirmsHostEndedBroadcast)) {
    return { error: "No active Broadcast is running in this Room.", status: 409 };
  }

  const message = healthMessage(input.status, input.message);
  const health = {
    status: input.status,
    message,
    updatedAt: now,
  };

  if (input.status === "failed") {
    broadcasts.set(input.roomId, {
      ...record,
      state: "failed",
      failureMessage: message,
      health,
    });
    credentials.delete(input.roomId);
    ingestGrants.delete(input.roomId);
    callbackGrants.delete(input.roomId);
    return { error: null, status: 202 };
  }

  if (input.status === "ended") {
    broadcasts.set(input.roomId, {
      ...record,
      state: "ended",
      failureMessage: null,
      health,
    });
    credentials.delete(input.roomId);
    ingestGrants.delete(input.roomId);
    callbackGrants.delete(input.roomId);
    return { error: null, status: 202 };
  }

  broadcasts.set(input.roomId, {
    ...record,
    health,
  });

  return { error: null, status: 202 };
}

export function getRoomProductBroadcastId(roomId: string): string | null {
  return broadcasts.get(roomId)?.productBroadcastId ?? null;
}

export function getPendingBroadcastAttempt(roomId: string): PendingBroadcastAttempt | null {
  return pendingBroadcastAttempts.get(roomId) ?? null;
}

export function startRoomBroadcastCountdown(input: {
  roomId: string;
  hostParticipantId: string;
  rtmpServerUrl: string;
  streamKey: string;
  countdownEndsAt: number;
  productBroadcastId: string;
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
  if (current.state === "broadcasting" || current.state === "countdown") {
    return { error: "A Broadcast is already active in this Room." };
  }

  broadcasts.set(input.roomId, {
    state: "countdown",
    failureMessage: null,
    hostParticipantId: input.hostParticipantId,
    health: null,
    countdownEndsAt: input.countdownEndsAt,
    productBroadcastId: input.productBroadcastId,
  });
  pendingBroadcastAttempts.set(input.roomId, {
    hostParticipantId: input.hostParticipantId,
    rtmpServerUrl,
    streamKey,
  });

  return { error: null };
}

export function cancelRoomBroadcastCountdown(input: {
  roomId: string;
  hostParticipantId: string;
}): { error: string | null } {
  const record = broadcasts.get(input.roomId);

  if (!record || record.state !== "countdown") {
    return { error: "No Broadcast Countdown is active in this Room." };
  }

  if (record.hostParticipantId !== input.hostParticipantId) {
    return { error: "Only the Host can cancel the Broadcast Countdown." };
  }

  broadcasts.delete(input.roomId);
  pendingBroadcastAttempts.delete(input.roomId);

  return { error: null };
}

export function completeRoomBroadcastCountdown(input: { roomId: string }): { error: string | null } {
  const record = broadcasts.get(input.roomId);
  const pending = pendingBroadcastAttempts.get(input.roomId);

  if (!record || record.state !== "countdown" || !pending) {
    return { error: "No Broadcast Countdown is ready to complete in this Room." };
  }

  const now = Date.now();
  if (!record.countdownEndsAt || record.countdownEndsAt > now + 250) {
    return { error: "Broadcast Countdown is still running." };
  }

  const productBroadcastId = record.productBroadcastId;
  pendingBroadcastAttempts.delete(input.roomId);
  broadcasts.delete(input.roomId);

  return startRoomBroadcast({
    roomId: input.roomId,
    hostParticipantId: pending.hostParticipantId,
    rtmpServerUrl: pending.rtmpServerUrl,
    streamKey: pending.streamKey,
    productBroadcastId,
  });
}

export function startRoomBroadcast(input: {
  roomId: string;
  hostParticipantId: string;
  rtmpServerUrl: string;
  streamKey: string;
  productBroadcastId?: string | null;
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
  if (current.state === "broadcasting" || current.state === "countdown") {
    return { error: "A Broadcast is already active in this Room." };
  }

  broadcasts.set(input.roomId, {
    state: "broadcasting",
    failureMessage: null,
    hostParticipantId: input.hostParticipantId,
    health: {
      status: "connecting",
      message: "Broadcast Bridge is connecting to the Broadcast Destination.",
      updatedAt: Date.now(),
    },
    countdownEndsAt: null,
    productBroadcastId: input.productBroadcastId ?? null,
  });
  credentials.set(input.roomId, { rtmpServerUrl, streamKey });
  ingestGrants.set(input.roomId, {
    whipUrl: `/whip/${encodeURIComponent(input.roomId)}`,
    bearerToken: `whip_${globalThis.crypto.randomUUID().replaceAll("-", "")}`,
    expiresAt: Date.now() + INGEST_TOKEN_TTL_MS,
  });
  callbackGrants.set(input.roomId, {
    callbackUrl: `/bridge/${encodeURIComponent(input.roomId)}/events`,
    bearerToken: `bridge_${globalThis.crypto.randomUUID().replaceAll("-", "")}`,
    expiresAt: Date.now() + CALLBACK_TOKEN_TTL_MS,
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
    health: {
      status: "ended",
      message: "Broadcast Bridge ended the Broadcast.",
      updatedAt: Date.now(),
    },
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
    health: {
      status: "failed",
      message: failureMessage,
      updatedAt: Date.now(),
    },
  });
  credentials.delete(input.roomId);
  ingestGrants.delete(input.roomId);
  callbackGrants.delete(input.roomId);

  return { error: null };
}

function healthMessage(status: BroadcastHealthStatus, message: string | undefined): string {
  const trimmed = message?.trim();
  if (trimmed) return trimmed;

  if (status === "connected") {
    return "Broadcast Bridge is connected to the Broadcast Destination.";
  }

  if (status === "degraded") {
    return "Broadcast Bridge reports degraded output quality.";
  }

  if (status === "ended") {
    return "Broadcast Bridge ended the Broadcast.";
  }

  if (status === "failed") {
    return "Broadcast Bridge reported a Broadcast failure.";
  }

  return "Broadcast Bridge is connecting to the Broadcast Destination.";
}

function bearerTokenFrom(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;

  const match = authorizationHeader.trim().match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
