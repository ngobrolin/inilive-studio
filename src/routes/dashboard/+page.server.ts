import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getHostSessionFromCookies } from "$lib/server/auth/host-session";
import { listHostRooms } from "$lib/server/rooms/rooms";
import { getRoomStore } from "$lib/server/rooms/runtime";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const session = await getHostSessionFromCookies(cookies);
  if (!session) {
    redirect(303, "/login");
  }

  const rooms = await listHostRooms(session.hostAccountId, { store: getRoomStore() });

  return {
    hostEmail: session.hostEmail,
    rooms,
    youtubeLinkStatus: url.searchParams.get("youtube"),
  };
};
