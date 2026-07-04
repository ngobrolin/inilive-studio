import type { RequestHandler } from "./$types";
import { getHostSessionFromCookies } from "$lib/server/auth/host-session";
import {
  decryptYouTubeRefreshToken,
  getGoogleYouTubeClient,
  getYouTubeStore,
  GoogleYouTubeApiError,
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

  let staleGoogleAuthorization = false;
  try {
    const refreshToken = decryptYouTubeRefreshToken(channelLink.refreshTokenCiphertext);
    await getGoogleYouTubeClient().revokeToken(refreshToken);
  } catch (error) {
    if (isStaleGoogleAuthorization(error)) {
      staleGoogleAuthorization = true;
    } else {
      return redirectTo("/dashboard?youtube=unlink-failed");
    }
  }

  try {
    await store.deleteChannelLinkForHost(session.hostAccountId);
  } catch {
    return redirectTo("/dashboard?youtube=unlink-cleanup-failed");
  }

  return redirectTo(
    staleGoogleAuthorization ? "/dashboard?youtube=unlinked-stale" : "/dashboard?youtube=unlinked",
  );
};

function isStaleGoogleAuthorization(error: unknown): boolean {
  return (
    error instanceof GoogleYouTubeApiError &&
    (error.reason === "invalid_grant" || error.reason === "invalid_token")
  );
}

function redirectTo(location: string) {
  return new Response(null, {
    status: 303,
    headers: { location },
  });
}
