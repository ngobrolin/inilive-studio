import { getYouTubeAccessToken } from "./access-token";
import { getGoogleYouTubeClient } from "./runtime";

export type ManagedYouTubeBroadcast = {
  youtubeBroadcastId: string;
  youtubeStreamId: string;
  rtmpServerUrl: string;
  streamKey: string;
};

export async function createManagedYouTubeBroadcast(input: {
  hostAccountId: string;
  roomTitle: string;
}): Promise<ManagedYouTubeBroadcast> {
  const accessToken = await getYouTubeAccessToken(input.hostAccountId);
  const client = getGoogleYouTubeClient();
  const title = input.roomTitle.trim() || "Inilive Broadcast";
  if (!client.createLiveStream || !client.createLiveBroadcast || !client.bindLiveBroadcast) {
    throw new Error("YouTube Data API client is not configured for managed Broadcasts");
  }

  const stream = await client.createLiveStream(accessToken, { title: `${title} stream` });
  const broadcast = await client.createLiveBroadcast(accessToken, {
    title,
    visibility: "private",
    latencyPreference: "low",
  });
  await client.bindLiveBroadcast(accessToken, {
    broadcastId: broadcast.id,
    streamId: stream.id,
  });

  return {
    youtubeBroadcastId: broadcast.id,
    youtubeStreamId: stream.id,
    rtmpServerUrl: stream.ingestionAddress,
    streamKey: stream.streamName,
  };
}
