import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getYouTubeAccessToken } from "./access-token";
import {
  clearYouTubeRuntimeForTests,
  decryptYouTubeRefreshToken,
  encryptYouTubeRefreshToken,
  getGoogleYouTubeClient,
  setYouTubeRuntimeForTests,
} from "./runtime";
import { createInMemoryYouTubeStore } from "./store";

describe("YouTube access tokens", () => {
  beforeEach(() => {
    clearYouTubeRuntimeForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("refreshes an access token for a Host's linked YouTube channel", async () => {
    const store = createInMemoryYouTubeStore();
    await store.saveChannelLink({
      hostAccountId: "host-1",
      youtubeChannelId: "channel-1",
      youtubeChannelTitle: "Live Channel",
      refreshTokenCiphertext: "encrypted-refresh-token",
    });
    const refreshAccessToken = vi.fn(async () => "fresh-access-token");
    setYouTubeRuntimeForTests({
      store,
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Live Channel" }),
        refreshAccessToken,
        revokeToken: async () => undefined,
      },
      decryptRefreshToken: () => "stored-refresh-token",
    });

    await expect(getYouTubeAccessToken("host-1")).resolves.toBe("fresh-access-token");
    expect(refreshAccessToken).toHaveBeenCalledWith("stored-refresh-token");
  });

  it("does not call Google when the Host has no linked YouTube channel", async () => {
    const refreshAccessToken = vi.fn(async () => "fresh-access-token");
    setYouTubeRuntimeForTests({
      store: createInMemoryYouTubeStore(),
      googleClient: {
        exchangeCode: async () => ({ accessToken: "unused", refreshToken: null }),
        getOwnChannel: async () => ({ id: "channel-1", title: "Live Channel" }),
        refreshAccessToken,
        revokeToken: async () => undefined,
      },
      decryptRefreshToken: () => "stored-refresh-token",
    });

    await expect(getYouTubeAccessToken("host-without-link")).rejects.toThrow(
      "Host has no linked YouTube channel",
    );
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it("decrypts the encrypted refresh token only on the server", () => {
    vi.stubEnv("YOUTUBE_REFRESH_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));

    const ciphertext = encryptYouTubeRefreshToken("stored-refresh-token");

    expect(ciphertext).not.toContain("stored-refresh-token");
    expect(decryptYouTubeRefreshToken(ciphertext)).toBe("stored-refresh-token");
  });

  it("uses Google's refresh-token grant", async () => {
    const fetchGoogle = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        Response.json({ access_token: "fresh-access-token", expires_in: 3600 }),
    );
    vi.stubGlobal("fetch", fetchGoogle);

    await expect(getGoogleYouTubeClient().refreshAccessToken("stored-refresh-token")).resolves.toBe(
      "fresh-access-token",
    );

    expect(fetchGoogle).toHaveBeenCalledOnce();
    const [url, init] = fetchGoogle.mock.calls[0] ?? [];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(init?.method).toBe("POST");
    const body = init?.body as URLSearchParams;
    expect(body.has("client_id")).toBe(true);
    expect(body.has("client_secret")).toBe(true);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("stored-refresh-token");
  });

  it("uses Google's OAuth revocation endpoint", async () => {
    const fetchGoogle = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        new Response(null, { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchGoogle);

    await expect(
      getGoogleYouTubeClient().revokeToken("stored-refresh-token"),
    ).resolves.toBeUndefined();

    expect(fetchGoogle).toHaveBeenCalledOnce();
    const [url, init] = fetchGoogle.mock.calls[0] ?? [];
    expect(url).toBe("https://oauth2.googleapis.com/revoke");
    expect(init?.method).toBe("POST");
    const body = init?.body as URLSearchParams;
    expect(body.get("token")).toBe("stored-refresh-token");
  });

  it("creates live broadcasts with an explicit 12-hour scheduled window", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 5, 23, 4, 0, 0));
    const fetchGoogle = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        Response.json({ id: "broadcast-1" }),
    );
    vi.stubGlobal("fetch", fetchGoogle);

    await expect(
      getGoogleYouTubeClient().createLiveBroadcast?.("fresh-access-token", {
        title: "Launch Room",
        visibility: "private",
        latencyPreference: "low",
      }),
    ).resolves.toEqual({ id: "broadcast-1" });

    expect(fetchGoogle).toHaveBeenCalledOnce();
    const [_url, init] = fetchGoogle.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));
    expect(body.snippet).toMatchObject({
      title: "Launch Room",
      scheduledStartTime: "2026-06-23T04:01:00.000Z",
      scheduledEndTime: "2026-06-23T16:00:00.000Z",
    });
    expect(body.contentDetails).toMatchObject({
      latencyPreference: "low",
      monitorStream: { enableMonitorStream: true },
    });
  });
});
