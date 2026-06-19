import { env } from "$env/dynamic/private";
import type { LiveKitMediaJoinGrant } from "$lib/server/livekit-hub";
import { issueLiveKitMediaJoinGrant, parseLiveKitTtlMs } from "$lib/server/livekit-hub";

export type MediaJoinGrant = LiveKitMediaJoinGrant & {
  provider: "livekit";
  stub: boolean;
};

export type LiveKitCredentials = {
  apiKey: string | undefined;
  apiSecret: string | undefined;
  serverUrl: string | undefined;
};

export function readLiveKitCredentials(): LiveKitCredentials {
  return {
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
    serverUrl: env.LIVEKIT_URL,
  };
}

export async function createMediaJoinGrant(
  input: {
    roomId: string;
    participantId: string;
    displayName: string;
    role: "host" | "guest";
  },
  credentials: LiveKitCredentials = readLiveKitCredentials(),
): Promise<MediaJoinGrant | null> {
  if (!input.participantId) {
    return null;
  }

  const { apiKey, apiSecret, serverUrl } = credentials;

  if (!apiKey || !apiSecret || !serverUrl) {
    return {
      provider: "livekit",
      stub: true,
      roomName: input.roomId,
      participantIdentity: input.participantId,
      token: "stub-token",
      serverUrl: "wss://stub.livekit.cloud",
      displayName: input.displayName,
      role: input.role,
      expiresAt: Date.now() + parseLiveKitTtlMs("6h"),
    };
  }

  const grant = await issueLiveKitMediaJoinGrant({
    apiKey,
    apiSecret,
    serverUrl,
    ...input,
  });

  return {
    ...grant,
    provider: "livekit",
    stub: false,
  };
}
