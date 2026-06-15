import { AccessToken } from "livekit-server-sdk";

export type RoomRole = "host" | "guest";

export type LiveKitMediaJoinGrant = {
  roomName: string;
  participantIdentity: string;
  token: string;
  serverUrl: string;
  displayName: string;
  role: RoomRole;
};

export async function issueLiveKitMediaJoinGrant(input: {
  apiKey: string;
  apiSecret: string;
  serverUrl: string;
  roomId: string;
  participantId: string;
  displayName: string;
  role: RoomRole;
}): Promise<LiveKitMediaJoinGrant> {
  const token = new AccessToken(input.apiKey, input.apiSecret, {
    identity: input.participantId,
    name: input.displayName,
    ttl: "1h",
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
  };
}
