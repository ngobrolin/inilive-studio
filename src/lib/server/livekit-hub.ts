import { AccessToken } from "livekit-server-sdk";

export type RoomRole = "host" | "guest";

export const LIVEKIT_JOIN_GRANT_TTL = "6h";

export type LiveKitMediaJoinGrant = {
  roomName: string;
  participantIdentity: string;
  token: string;
  serverUrl: string;
  displayName: string;
  role: RoomRole;
  expiresAt: number;
};

const LIVEKIT_TTL_PATTERN = /^(\d+)(m|h)$/;

export function parseLiveKitTtlMs(ttl: string): number {
  const match = LIVEKIT_TTL_PATTERN.exec(ttl);
  if (!match) {
    throw new Error(`Unsupported LiveKit TTL format: ${ttl}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const minuteMs = 60 * 1000;
  return unit === "h" ? amount * 60 * minuteMs : amount * minuteMs;
}

export async function issueLiveKitMediaJoinGrant(
  input: {
    apiKey: string;
    apiSecret: string;
    serverUrl: string;
    roomId: string;
    participantId: string;
    displayName: string;
    role: RoomRole;
  },
  options: { now?: number } = {},
): Promise<LiveKitMediaJoinGrant> {
  const now = options.now ?? Date.now();
  const token = new AccessToken(input.apiKey, input.apiSecret, {
    identity: input.participantId,
    name: input.displayName,
    ttl: LIVEKIT_JOIN_GRANT_TTL,
  });

  token.addGrant({
    roomJoin: true,
    room: input.roomId,
    canPublish: true,
    canSubscribe: true,
  });

  return {
    roomName: input.roomId,
    participantIdentity: input.participantId,
    token: await token.toJwt(),
    serverUrl: input.serverUrl,
    displayName: input.displayName,
    role: input.role,
    expiresAt: now + parseLiveKitTtlMs(LIVEKIT_JOIN_GRANT_TTL),
  };
}
