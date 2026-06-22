import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryYouTubeStore } from "./store";
import {
  completeManagedYouTubeBroadcast,
  createManagedYouTubeBroadcast,
  transitionManagedYouTubeBroadcastLive,
} from "./managed-broadcast";
import { clearYouTubeRuntimeForTests, setYouTubeRuntimeForTests } from "./runtime";

describe("managed YouTube Broadcasts", () => {
  beforeEach(() => {
    clearYouTubeRuntimeForTests();
  });

  afterEach(() => {
    clearYouTubeRuntimeForTests();
  });

  it("creates a liveStream, creates a liveBroadcast, and binds them with a transient stream key", async () => {
    const store = createInMemoryYouTubeStore();
    await store.saveChannelLink({
      hostAccountId: "host-1",
      youtubeChannelId: "channel-1",
      youtubeChannelTitle: "Linked Channel",
      refreshTokenCiphertext: "encrypted-refresh-token",
    });
    const createLiveStream = vi.fn(async () => ({
      id: "stream-1",
      ingestionAddress: "rtmp://a.rtmp.youtube.com/live2",
      streamName: "api-issued-stream-key",
    }));
    const createLiveBroadcast = vi.fn(async () => ({ id: "broadcast-1" }));
    const bindLiveBroadcast = vi.fn(async () => undefined);
    setYouTubeRuntimeForTests({
      store,
      decryptRefreshToken: () => "stored-refresh-token",
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Linked Channel" }),
        refreshAccessToken: async () => "fresh-access-token",
        revokeToken: async () => undefined,
        createLiveStream,
        createLiveBroadcast,
        bindLiveBroadcast,
      },
    });

    await expect(
      createManagedYouTubeBroadcast({ hostAccountId: "host-1", roomTitle: "Launch Room" }),
    ).resolves.toEqual({
      youtubeBroadcastId: "broadcast-1",
      youtubeStreamId: "stream-1",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "api-issued-stream-key",
    });
    expect(createLiveStream).toHaveBeenCalledWith("fresh-access-token", {
      title: "Launch Room stream",
    });
    expect(createLiveBroadcast).toHaveBeenCalledWith("fresh-access-token", {
      title: "Launch Room",
      visibility: "private",
      latencyPreference: "low",
    });
    expect(bindLiveBroadcast).toHaveBeenCalledWith("fresh-access-token", {
      broadcastId: "broadcast-1",
      streamId: "stream-1",
    });
  });

  it("waits for the bound stream to become active before transitioning the Broadcast live", async () => {
    const store = createInMemoryYouTubeStore();
    await store.saveChannelLink({
      hostAccountId: "host-1",
      youtubeChannelId: "channel-1",
      youtubeChannelTitle: "Linked Channel",
      refreshTokenCiphertext: "encrypted-refresh-token",
    });
    const getLiveStreamStatus = vi.fn(async () =>
      getLiveStreamStatus.mock.calls.length === 1 ? "inactive" : "active",
    );
    const getLiveBroadcastLifeCycleStatus = vi.fn(async () =>
      getLiveBroadcastLifeCycleStatus.mock.calls.length === 1 ? "testStarting" : "testing",
    );
    const transitionLiveBroadcast = vi.fn(async () => undefined);
    let now = 0;
    setYouTubeRuntimeForTests({
      store,
      decryptRefreshToken: () => "stored-refresh-token",
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Linked Channel" }),
        refreshAccessToken: async () => "fresh-access-token",
        revokeToken: async () => undefined,
        getLiveStreamStatus,
        getLiveBroadcastLifeCycleStatus,
        transitionLiveBroadcast,
      },
    });

    await transitionManagedYouTubeBroadcastLive({
      hostAccountId: "host-1",
      youtubeBroadcastId: "broadcast-1",
      youtubeStreamId: "stream-1",
      now: () => now,
      sleep: async (milliseconds) => {
        now += milliseconds;
      },
    });

    expect(getLiveStreamStatus).toHaveBeenCalledTimes(2);
    expect(getLiveStreamStatus).toHaveBeenCalledWith("fresh-access-token", {
      streamId: "stream-1",
    });
    expect(transitionLiveBroadcast).toHaveBeenNthCalledWith(1, "fresh-access-token", {
      broadcastId: "broadcast-1",
      status: "testing",
    });
    expect(getLiveBroadcastLifeCycleStatus).toHaveBeenCalledTimes(2);
    expect(getLiveBroadcastLifeCycleStatus).toHaveBeenCalledWith("fresh-access-token", {
      broadcastId: "broadcast-1",
    });
    expect(transitionLiveBroadcast).toHaveBeenNthCalledWith(2, "fresh-access-token", {
      broadcastId: "broadcast-1",
      status: "live",
    });
  });

  it("transitions a managed Broadcast complete so YouTube finalizes the archive", async () => {
    const store = createInMemoryYouTubeStore();
    await store.saveChannelLink({
      hostAccountId: "host-1",
      youtubeChannelId: "channel-1",
      youtubeChannelTitle: "Linked Channel",
      refreshTokenCiphertext: "encrypted-refresh-token",
    });
    const transitionLiveBroadcast = vi.fn(async () => undefined);
    setYouTubeRuntimeForTests({
      store,
      decryptRefreshToken: () => "stored-refresh-token",
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Linked Channel" }),
        refreshAccessToken: async () => "fresh-access-token",
        revokeToken: async () => undefined,
        transitionLiveBroadcast,
      },
    });

    await completeManagedYouTubeBroadcast({
      hostAccountId: "host-1",
      youtubeBroadcastId: "broadcast-1",
    });

    expect(transitionLiveBroadcast).toHaveBeenCalledWith("fresh-access-token", {
      broadcastId: "broadcast-1",
      status: "complete",
    });
  });
});
