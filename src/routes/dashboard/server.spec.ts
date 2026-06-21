import { beforeEach, describe, expect, it } from "vitest";
import { load } from "./+page.server";
import { createInMemoryAuthStore } from "$lib/server/auth/store";
import { clearAuthRuntimeForTests, setAuthRuntimeForTests } from "$lib/server/auth/runtime";
import { buildHostSessionCookie, exchangeMagicLinkForSession } from "$lib/server/auth/sessions";
import { generateSecureToken, hashToken } from "$lib/server/auth/tokens";
import { clearRoomStoreForTests, setRoomStoreForTests } from "$lib/server/rooms/runtime";
import { createInMemoryRoomStore } from "$lib/server/rooms/store";
import { clearYouTubeRuntimeForTests, setYouTubeStoreForTests } from "$lib/server/youtube/runtime";
import { createInMemoryYouTubeStore } from "$lib/server/youtube/store";

describe("Host dashboard", () => {
  beforeEach(() => {
    clearAuthRuntimeForTests();
    clearRoomStoreForTests();
    clearYouTubeRuntimeForTests();
    setRoomStoreForTests(createInMemoryRoomStore());
  });

  it("loads linked YouTube channel metadata without exposing token storage", async () => {
    const authStore = createInMemoryAuthStore();
    setAuthRuntimeForTests({ store: authStore });
    const host = await authStore.createHostAccount("host@example.com");
    const token = generateSecureToken();
    await authStore.createMagicLink(host.id, hashToken(token), new Date(Date.now() + 60_000));
    const exchange = await exchangeMagicLinkForSession({ token }, { store: authStore });

    const youtubeStore = createInMemoryYouTubeStore();
    await youtubeStore.saveChannelLink({
      hostAccountId: host.id,
      youtubeChannelId: "channel-1",
      youtubeChannelTitle: "Live Channel",
      refreshTokenCiphertext: "encrypted-refresh-token",
    });
    setYouTubeStoreForTests(youtubeStore);

    const cookie = buildHostSessionCookie(exchange.sessionToken!, exchange.expiresAt!, {
      secure: false,
    });
    const data = (await load({
      cookies: {
        get(name: string) {
          const match = cookie.match(new RegExp(`${name}=([^;]+)`));
          return match?.[1];
        },
      },
      url: new URL("http://localhost/dashboard"),
    } as never)) as Record<string, unknown>;

    expect(data.youtubeChannel).toEqual({
      id: "channel-1",
      title: "Live Channel",
    });
    expect(JSON.stringify(data)).not.toContain("encrypted-refresh-token");
  });
});
