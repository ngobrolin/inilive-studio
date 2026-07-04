import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postYouTubeUnlink } from "./+server";
import { createInMemoryAuthStore } from "$lib/server/auth/store";
import { clearAuthRuntimeForTests, setAuthRuntimeForTests } from "$lib/server/auth/runtime";
import { buildHostSessionCookie, exchangeMagicLinkForSession } from "$lib/server/auth/sessions";
import { generateSecureToken, hashToken } from "$lib/server/auth/tokens";
import {
  clearYouTubeRuntimeForTests,
  GoogleYouTubeApiError,
  setYouTubeRuntimeForTests,
} from "$lib/server/youtube/runtime";
import { createInMemoryYouTubeStore } from "$lib/server/youtube/store";

describe("YouTube unlink endpoint", () => {
  beforeEach(() => {
    clearAuthRuntimeForTests();
    clearYouTubeRuntimeForTests();
  });

  it("requires a signed-in Host session", async () => {
    const response = await postUnlinkRequest();

    expect(response.status).toBe(401);
  });

  it("revokes and deletes the signed-in Host's linked channel", async () => {
    const { sessionToken, expiresAt, hostAccountId } = await createSignedInHost();
    const store = createInMemoryYouTubeStore();
    await store.saveChannelLink({
      hostAccountId,
      youtubeChannelId: "channel-1",
      youtubeChannelTitle: "Live Channel",
      refreshTokenCiphertext: "encrypted-refresh-token",
    });
    const revokeToken = vi.fn(async () => undefined);
    setYouTubeRuntimeForTests({
      store,
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Live Channel" }),
        refreshAccessToken: async () => "unused",
        revokeToken,
      },
      decryptRefreshToken: () => "stored-refresh-token",
    });

    const response = await postUnlinkRequest(sessionToken, expiresAt);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard?youtube=unlinked");
    expect(revokeToken).toHaveBeenCalledWith("stored-refresh-token");
    await expect(store.getChannelLinkForHost(hostAccountId)).resolves.toBeNull();
  });

  it("fails safely when the Host has no linked channel", async () => {
    const { sessionToken, expiresAt } = await createSignedInHost();
    const revokeToken = vi.fn(async () => undefined);
    setYouTubeRuntimeForTests({
      store: createInMemoryYouTubeStore(),
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Live Channel" }),
        refreshAccessToken: async () => "unused",
        revokeToken,
      },
      decryptRefreshToken: () => "stored-refresh-token",
    });

    const response = await postUnlinkRequest(sessionToken, expiresAt);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard?youtube=not-linked");
    expect(revokeToken).not.toHaveBeenCalled();
  });

  it("keeps the channel link when Google revocation fails", async () => {
    const { sessionToken, expiresAt, hostAccountId } = await createSignedInHost();
    const store = createInMemoryYouTubeStore();
    await store.saveChannelLink({
      hostAccountId,
      youtubeChannelId: "channel-1",
      youtubeChannelTitle: "Live Channel",
      refreshTokenCiphertext: "encrypted-refresh-token",
    });
    setYouTubeRuntimeForTests({
      store,
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Live Channel" }),
        refreshAccessToken: async () => "unused",
        revokeToken: async () => {
          throw new Error("Google unavailable");
        },
      },
      decryptRefreshToken: () => "stored-refresh-token",
    });

    const response = await postUnlinkRequest(sessionToken, expiresAt);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard?youtube=unlink-failed");
    await expect(store.getChannelLinkForHost(hostAccountId)).resolves.toMatchObject({
      youtubeChannelId: "channel-1",
    });
  });

  it("removes a stale channel link when Google says the stored authorization is invalid", async () => {
    const { sessionToken, expiresAt, hostAccountId } = await createSignedInHost();
    const store = createInMemoryYouTubeStore();
    await store.saveChannelLink({
      hostAccountId,
      youtubeChannelId: "channel-1",
      youtubeChannelTitle: "Live Channel",
      refreshTokenCiphertext: "encrypted-refresh-token",
    });
    setYouTubeRuntimeForTests({
      store,
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Live Channel" }),
        refreshAccessToken: async () => "unused",
        revokeToken: async () => {
          throw new GoogleYouTubeApiError({
            operation: "Google OAuth token revocation",
            status: 400,
            reason: "invalid_grant",
            googleMessage: "Token has been expired or revoked.",
          });
        },
      },
      decryptRefreshToken: () => "stored-refresh-token",
    });

    const response = await postUnlinkRequest(sessionToken, expiresAt);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard?youtube=unlinked-stale");
    await expect(store.getChannelLinkForHost(hostAccountId)).resolves.toBeNull();
  });

  it("reports local cleanup failure separately after Google revocation succeeds", async () => {
    const { sessionToken, expiresAt, hostAccountId } = await createSignedInHost();
    const backingStore = createInMemoryYouTubeStore();
    await backingStore.saveChannelLink({
      hostAccountId,
      youtubeChannelId: "channel-1",
      youtubeChannelTitle: "Live Channel",
      refreshTokenCiphertext: "encrypted-refresh-token",
    });
    const revokeToken = vi.fn(async () => undefined);
    setYouTubeRuntimeForTests({
      store: {
        ...backingStore,
        deleteChannelLinkForHost: async () => {
          throw new Error("Database unavailable");
        },
      },
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Live Channel" }),
        refreshAccessToken: async () => "unused",
        revokeToken,
      },
      decryptRefreshToken: () => "stored-refresh-token",
    });

    const response = await postUnlinkRequest(sessionToken, expiresAt);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard?youtube=unlink-cleanup-failed");
    expect(revokeToken).toHaveBeenCalledOnce();
  });
});

async function createSignedInHost() {
  const authStore = createInMemoryAuthStore();
  setAuthRuntimeForTests({ store: authStore });
  const host = await authStore.createHostAccount("host@example.com");
  const token = generateSecureToken();
  await authStore.createMagicLink(host.id, hashToken(token), new Date(Date.now() + 60_000));
  const exchange = await exchangeMagicLinkForSession({ token }, { store: authStore });
  return {
    hostAccountId: host.id,
    sessionToken: exchange.sessionToken!,
    expiresAt: exchange.expiresAt!,
  };
}

function postUnlinkRequest(sessionToken?: string, expiresAt?: Date): Promise<Response> {
  const headers: Record<string, string> = {};
  if (sessionToken && expiresAt) {
    headers.Cookie = buildHostSessionCookie(sessionToken, expiresAt, { secure: false });
  }

  return Promise.resolve(
    postYouTubeUnlink({
      request: new Request("http://localhost/youtube/unlink", {
        method: "POST",
        headers,
      }),
      cookies: {
        get(name: string) {
          const cookie = headers.Cookie ?? "";
          const match = cookie.match(new RegExp(`${name}=([^;]+)`));
          return match?.[1];
        },
      },
    } as never),
  );
}
