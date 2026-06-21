import {
  decryptYouTubeRefreshToken,
  getGoogleYouTubeClient,
  getYouTubeStore,
} from "./runtime";

export async function getYouTubeAccessToken(hostAccountId: string): Promise<string> {
  const channelLink = await getYouTubeStore().getChannelLinkForHost(hostAccountId);
  if (!channelLink) {
    throw new Error("Host has no linked YouTube channel");
  }

  const refreshToken = decryptYouTubeRefreshToken(channelLink.refreshTokenCiphertext);
  return getGoogleYouTubeClient().refreshAccessToken(refreshToken);
}
