import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getHostSessionFromCookies } from "$lib/server/auth/host-session";
import { listHostRooms } from "$lib/server/rooms/rooms";
import { getRoomStore } from "$lib/server/rooms/runtime";
import { getYouTubeStore } from "$lib/server/youtube/runtime";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const session = await getHostSessionFromCookies(cookies);
  if (!session) {
    redirect(303, "/login");
  }

  const [rooms, youtubeChannelLink] = await Promise.all([
    listHostRooms(session.hostAccountId, { store: getRoomStore() }),
    getYouTubeStore().getChannelLinkForHost(session.hostAccountId),
  ]);

  return {
    hostEmail: session.hostEmail,
    rooms,
    youtubeChannel: youtubeChannelLink
      ? {
          id: youtubeChannelLink.youtubeChannelId,
          title: youtubeChannelLink.youtubeChannelTitle,
        }
      : null,
    youtubeLinkStatus: url.searchParams.get("youtube"),
  };
};
