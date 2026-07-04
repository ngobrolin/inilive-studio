import type { RequestHandler } from "./$types";
import {
  encryptYouTubeRefreshToken,
  getGoogleYouTubeClient,
  getYouTubeOAuthConfig,
  getYouTubeStore,
} from "$lib/server/youtube/runtime";

const failureLocation = "/dashboard?youtube=link-failed";

export const GET: RequestHandler = async ({ url }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return redirectTo(failureLocation);
  }

  const oauthState = await getYouTubeStore().consumeOAuthState(state);
  if (!oauthState) {
    return redirectTo(failureLocation);
  }

  try {
    const client = getGoogleYouTubeClient();
    const tokens = await client.exchangeCode(code, {
      redirectUri: getYouTubeOAuthConfig(url.origin).redirectUri,
    });
    if (!tokens.refreshToken) {
      return redirectTo(failureLocation);
    }

    const channel = await client.getOwnChannel(tokens.accessToken);
    await getYouTubeStore().saveChannelLink({
      hostAccountId: oauthState.hostAccountId,
      youtubeChannelId: channel.id,
      youtubeChannelTitle: channel.title,
      refreshTokenCiphertext: encryptYouTubeRefreshToken(tokens.refreshToken),
    });
  } catch {
    return redirectTo(failureLocation);
  }

  return redirectTo("/dashboard?youtube=linked");
};

function redirectTo(location: string) {
  return new Response(null, {
    status: 303,
    headers: { location },
  });
}
