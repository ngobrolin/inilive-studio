import { redirect } from "@sveltejs/kit";
import type { Cookies } from "@sveltejs/kit";
import { getHostSessionFromCookies } from "$lib/server/auth/host-session";
import { resolveProductRoomHostAccess } from "$lib/server/rooms/host-access";
import { getRoomStore } from "$lib/server/rooms/runtime";

export async function requireProductRoomHostSession(cookies: Cookies, roomId: string) {
  const session = await getHostSessionFromCookies(cookies);
  const access = await resolveProductRoomHostAccess(roomId, session, {
    store: getRoomStore(),
  });

  if (access.kind === "prototype_room") {
    return null;
  }

  if (access.kind === "sign_in_required") {
    redirect(303, "/login");
  }

  if (access.kind === "forbidden") {
    redirect(303, "/dashboard");
  }

  return session;
}
