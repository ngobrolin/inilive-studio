import type { RequestHandler } from "./$types";
import { getHostSessionFromCookies } from "$lib/server/auth/host-session";
import {
  decryptYouTubeRefreshToken,
  getGoogleYouTubeClient,
  getYouTubeStore,
} from "$lib/server/youtube/runtime";

export const POST: RequestHandler = async ({ cookies }) => {
  const session = await getHostSessionFromCookies(cookies);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const store = getYouTubeStore();
  const channelLink = await store.getChannelLinkForHost(session.hostAccountId);
  if (!channelLink) {
    return redirectTo("/dashboard?youtube=not-linked");
  }

  try {
    const refreshToken = decryptYouTubeRefreshToken(channelLink.refreshTokenCiphertext);
    await getGoogleYouTubeClient().revokeToken(refreshToken);
  } catch {
    return redirectTo("/dashboard?youtube=unlink-failed");
  }

  try {
    await store.deleteChannelLinkForHost(session.hostAccountId);
  } catch {
    return redirectTo("/dashboard?youtube=unlink-cleanup-failed");
  }

  return redirectTo("/dashboard?youtube=unlinked");
};

function redirectTo(location: string) {
  return new Response(null, {
    status: 303,
    headers: { location },
  });
}
