import { env } from "$env/dynamic/private";
import type { LiveKitMediaJoinGrant } from "$lib/server/livekit-hub";
import { issueLiveKitMediaJoinGrant } from "$lib/server/livekit-hub";

export type MediaJoinGrant = LiveKitMediaJoinGrant & {
  provider: "livekit";
  stub: boolean;
};

export async function createMediaJoinGrant(input: {
  roomId: string;
  participantId: string;
  displayName: string;
  role: "host" | "guest";
}): Promise<MediaJoinGrant | null> {
  if (!input.participantId) {
    return null;
  }

  const apiKey = env.LIVEKIT_API_KEY;
  const apiSecret = env.LIVEKIT_API_SECRET;
  const serverUrl = env.LIVEKIT_URL;

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
