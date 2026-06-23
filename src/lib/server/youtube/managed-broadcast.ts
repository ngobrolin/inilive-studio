import { getYouTubeAccessToken } from "./access-token";
import { getGoogleYouTubeClient } from "./runtime";

export type ManagedYouTubeBroadcast = {
  youtubeBroadcastId: string;
  youtubeStreamId: string;
  rtmpServerUrl: string;
  streamKey: string;
};

const STREAM_ACTIVE_POLL_INTERVAL_MS = 2_000;
const STREAM_ACTIVE_TIMEOUT_MS = 60_000;
const BROADCAST_LIVE_POLL_INTERVAL_MS = 2_000;
const BROADCAST_LIVE_TIMEOUT_MS = 60_000;

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

export async function transitionManagedYouTubeBroadcastLive(input: {
  hostAccountId: string;
  youtubeBroadcastId: string;
  youtubeStreamId: string;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
}): Promise<void> {
  const accessToken = await getYouTubeAccessToken(input.hostAccountId);
  const client = getGoogleYouTubeClient();
  if (
    !client.getLiveStreamStatus ||
    !client.getLiveBroadcastLifeCycleStatus
  ) {
    throw new Error("YouTube Data API client is not configured for Broadcast transitions");
  }

  const now = input.now ?? Date.now;
  const sleep =
    input.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const deadline = now() + STREAM_ACTIVE_TIMEOUT_MS;

  while (true) {
    const status = await client.getLiveStreamStatus(accessToken, {
      streamId: input.youtubeStreamId,
    });
    if (status === "active") {
      break;
    }
    if (now() >= deadline) {
      throw new Error("YouTube liveStream did not become active before transition timeout");
    }
    await sleep(STREAM_ACTIVE_POLL_INTERVAL_MS);
  }

  const liveDeadline = now() + BROADCAST_LIVE_TIMEOUT_MS;
  while (true) {
    const status = await client.getLiveBroadcastLifeCycleStatus(accessToken, {
      broadcastId: input.youtubeBroadcastId,
    });
    if (status === "live") {
      return;
    }
    if (now() >= liveDeadline) {
      throw new Error("YouTube liveBroadcast did not enter live before auto-start timeout");
    }
    await sleep(BROADCAST_LIVE_POLL_INTERVAL_MS);
  }
}

export async function completeManagedYouTubeBroadcast(input: {
  hostAccountId: string;
  youtubeBroadcastId: string;
}): Promise<void> {
  const accessToken = await getYouTubeAccessToken(input.hostAccountId);
  const client = getGoogleYouTubeClient();
  if (!client.transitionLiveBroadcast) {
    throw new Error("YouTube Data API client is not configured for Broadcast transitions");
  }

  await client.transitionLiveBroadcast(accessToken, {
    broadcastId: input.youtubeBroadcastId,
    status: "complete",
  });
}
