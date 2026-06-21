import { beforeEach, describe, expect, it } from "vitest";
import { GET as getYouTubeCallback } from "./+server";
import { createInMemoryYouTubeStore } from "$lib/server/youtube/store";
import {
  clearYouTubeRuntimeForTests,
  setYouTubeRuntimeForTests,
} from "$lib/server/youtube/runtime";

describe("YouTube OAuth callback endpoint", () => {
  let store: ReturnType<typeof createInMemoryYouTubeStore>;

  beforeEach(() => {
    store = createInMemoryYouTubeStore();
    clearYouTubeRuntimeForTests();
    setYouTubeRuntimeForTests({
      store,
      googleClient: {
        exchangeCode: async () => ({ accessToken: "access-token", refreshToken: "refresh-token" }),
        getOwnChannel: async () => ({ id: "youtube-channel-1", title: "Live Channel" }),
        refreshAccessToken: async () => "unused",
        revokeToken: async () => undefined,
      },
      encryptRefreshToken: (refreshToken) => `encrypted:${refreshToken}`,
    });
  });

  it("redirects safely when Google returns an unknown state", async () => {
    const response = await getCallback("code=google-code&state=unknown-state");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard?youtube=link-failed");
  });

  it("exchanges a valid callback and records the linked channel", async () => {
    await store.saveOAuthState({
      hostAccountId: "host-1",
      state: "valid-state",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const response = await getCallback("code=google-code&state=valid-state");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard?youtube=linked");
    await expect(store.getChannelLinkForHost("host-1")).resolves.toMatchObject({
      hostAccountId: "host-1",
      youtubeChannelId: "youtube-channel-1",
      youtubeChannelTitle: "Live Channel",
      refreshTokenCiphertext: "encrypted:refresh-token",
    });

    const replay = await getCallback("code=google-code&state=valid-state");
    expect(replay.headers.get("location")).toBe("/dashboard?youtube=link-failed");
  });

  it("fails safely when Google does not return a refresh token", async () => {
    setYouTubeRuntimeForTests({
      store,
      googleClient: {
        exchangeCode: async () => ({ accessToken: "access-token", refreshToken: null }),
        getOwnChannel: async () => ({ id: "youtube-channel-1", title: "Live Channel" }),
        refreshAccessToken: async () => "unused",
        revokeToken: async () => undefined,
      },
      encryptRefreshToken: (refreshToken) => `encrypted:${refreshToken}`,
    });
    await store.saveOAuthState({
      hostAccountId: "host-1",
      state: "missing-refresh-token-state",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const response = await getCallback("code=google-code&state=missing-refresh-token-state");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard?youtube=link-failed");
    await expect(store.getChannelLinkForHost("host-1")).resolves.toBeNull();
  });

  it("fails safely when Google token exchange fails", async () => {
    setYouTubeRuntimeForTests({
      store,
      googleClient: {
        exchangeCode: async () => {
          throw new Error("invalid_grant");
        },
        getOwnChannel: async () => ({ id: "youtube-channel-1", title: "Live Channel" }),
        refreshAccessToken: async () => "unused",
        revokeToken: async () => undefined,
      },
      encryptRefreshToken: (refreshToken) => `encrypted:${refreshToken}`,
    });
    await store.saveOAuthState({
      hostAccountId: "host-1",
      state: "exchange-failure-state",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const response = await getCallback("code=bad-code&state=exchange-failure-state");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard?youtube=link-failed");
    await expect(store.getChannelLinkForHost("host-1")).resolves.toBeNull();
  });
});

function getCallback(query: string): Promise<Response> {
  return Promise.resolve(
    getYouTubeCallback({
      url: new URL(`http://localhost/youtube/callback?${query}`),
    } as never),
  );
}
