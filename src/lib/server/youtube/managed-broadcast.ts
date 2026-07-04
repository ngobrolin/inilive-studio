import { getYouTubeAccessToken } from "./access-token";
import { getGoogleYouTubeClient, GoogleYouTubeApiError } from "./runtime";

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

export function describeManagedYouTubeBroadcastFailure(error: unknown): string {
  if (!(error instanceof GoogleYouTubeApiError)) {
    return "YouTube could not create the managed Broadcast. Check channel live permissions and API quota, then try again.";
  }

  switch (error.reason) {
    case "liveStreamingNotEnabled":
      return "YouTube live streaming is not enabled for the linked channel. Enable live streaming in YouTube Studio, wait for YouTube to activate it, then try again.";
    case "livePermissionBlocked":
      return "YouTube has blocked live streaming for the linked channel. Check the channel's live streaming eligibility in YouTube Studio, then try again.";
    case "insufficientLivePermissions":
      return "The linked Google account is not authorized to create YouTube live broadcasts. Relink the correct live-enabled channel, then try again.";
    case "quotaExceeded":
    case "rateLimitExceeded":
    case "userRequestsExceedRateLimit":
      return "The YouTube Data API quota or request rate limit was reached. Wait for quota to recover or use a Google Cloud project with available YouTube Data API quota.";
    case "userBroadcastsExceedLimit":
      return "The linked YouTube channel has too many live or scheduled broadcasts. Complete or delete old scheduled events in YouTube Studio, then try again.";
    case "invalidAutoStart":
    case "invalidAutoStop":
    case "invalidLatencyPreferenceOptions":
    case "invalidScheduledEndTime":
    case "invalidScheduledStartTime":
    case "invalidTitle":
      return `YouTube rejected iniLive Studio's managed Broadcast settings (${error.reason}). This is an application-side request issue; keep the channel linked and retry after the app is updated.`;
    case "invalid_grant":
      return "Google rejected the stored YouTube authorization. Unlink and link the YouTube channel again, then try again.";
    default:
      return error.reason
        ? `YouTube could not create the managed Broadcast (${error.reason}). Check the linked channel and Google Cloud project, then try again.`
        : "YouTube could not create the managed Broadcast. Check channel live permissions and API quota, then try again.";
  }
}

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
  if (!client.getLiveStreamStatus || !client.getLiveBroadcastLifeCycleStatus) {
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
