import { beforeEach, describe, expect, it } from "vitest";
import { POST as postYouTubeLink } from "./+server";
import { createInMemoryAuthStore } from "$lib/server/auth/store";
import { clearAuthRuntimeForTests, setAuthRuntimeForTests } from "$lib/server/auth/runtime";
import { buildHostSessionCookie, exchangeMagicLinkForSession } from "$lib/server/auth/sessions";
import { generateSecureToken, hashToken } from "$lib/server/auth/tokens";
import { createInMemoryYouTubeStore } from "$lib/server/youtube/store";
import { clearYouTubeRuntimeForTests, setYouTubeStoreForTests } from "$lib/server/youtube/runtime";

describe("YouTube link endpoint", () => {
  beforeEach(() => {
    clearAuthRuntimeForTests();
    clearYouTubeRuntimeForTests();
    setYouTubeStoreForTests(createInMemoryYouTubeStore());
  });

  it("requires a signed-in Host session", async () => {
    const response = await postLinkRequest();

    expect(response.status).toBe(401);
  });

  it("redirects a signed-in Host to Google OAuth", async () => {
    const authStore = createInMemoryAuthStore();
    setAuthRuntimeForTests({ store: authStore });
    const host = await authStore.createHostAccount("host@example.com");
    const token = generateSecureToken();
    await authStore.createMagicLink(host.id, hashToken(token), new Date(Date.now() + 60_000));
    const exchange = await exchangeMagicLinkForSession({ token }, { store: authStore });

    const response = await postLinkRequest(exchange.sessionToken!, exchange.expiresAt!);

    expect(response.status).toBe(303);
    const location = response.headers.get("location");
    expect(location).toBeTruthy();
    const url = new URL(location!);
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/youtube");
    expect(url.searchParams.get("state")).toBeTruthy();
  });
});

function postLinkRequest(sessionToken?: string, expiresAt?: Date): Promise<Response> {
  const headers: Record<string, string> = {};
  if (sessionToken && expiresAt) {
    headers.Cookie = buildHostSessionCookie(sessionToken, expiresAt, { secure: false });
  }

  return Promise.resolve(
    postYouTubeLink({
      request: new Request("http://localhost/youtube/link", {
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
