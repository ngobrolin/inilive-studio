import { describe, expect, it } from "vitest";
import { createYouTubeOAuthStart } from "./oauth";

describe("YouTube OAuth linking", () => {
  it("builds a Google authorization URL with a host-bound state", async () => {
    const start = await createYouTubeOAuthStart(
      { hostAccountId: "host-1" },
      {
        clientId: "google-client-id",
        redirectUri: "https://studio.example.com/youtube/callback",
        createState: () => "state-token",
        saveState: async () => undefined,
      },
    );

    const url = new URL(start.authorizationUrl);
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("https://studio.example.com/youtube/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/youtube");
    expect(url.searchParams.get("state")).toBe("state-token");
  });
});
