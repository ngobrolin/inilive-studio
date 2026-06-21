import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryYouTubeStore } from "./store";
import { createManagedYouTubeBroadcast } from "./managed-broadcast";
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
});
