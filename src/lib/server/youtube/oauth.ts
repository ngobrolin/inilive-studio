export const YOUTUBE_OAUTH_SCOPE = "https://www.googleapis.com/auth/youtube";

export type YouTubeOAuthStart = {
  authorizationUrl: string;
  state: string;
};

export async function createYouTubeOAuthStart(
  input: { hostAccountId: string },
  deps: {
    clientId: string;
    redirectUri: string;
    createState: () => string;
    saveState: (state: { hostAccountId: string; state: string; expiresAt: Date }) => Promise<void>;
  },
): Promise<YouTubeOAuthStart> {
  const state = deps.createState();
  await deps.saveState({
    hostAccountId: input.hostAccountId,
    state,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", deps.clientId);
  url.searchParams.set("redirect_uri", deps.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", YOUTUBE_OAUTH_SCOPE);
  url.searchParams.set("state", state);

  return { authorizationUrl: url.toString(), state };
}
