import type { RequestHandler } from "./$types";
import { getHostSessionFromCookies } from "$lib/server/auth/host-session";
import { createYouTubeOAuthStart } from "$lib/server/youtube/oauth";
import { getYouTubeOAuthConfig, getYouTubeStore } from "$lib/server/youtube/runtime";

export const POST: RequestHandler = async ({ cookies }) => {
  const session = await getHostSessionFromCookies(cookies);
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const store = getYouTubeStore();
  const config = getYouTubeOAuthConfig();
  const start = await createYouTubeOAuthStart(
    { hostAccountId: session.hostAccountId },
    {
      ...config,
      saveState: (state) => store.saveOAuthState(state),
    },
  );

  return new Response(null, {
    status: 303,
    headers: { location: start.authorizationUrl },
  });
};
