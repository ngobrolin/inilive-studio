import type { PageServerLoad } from "./$types";
import { requireProductRoomHostSession } from "$lib/server/rooms/require-host-session";
import { getGuestInvitePathForHost } from "$lib/server/rooms/rooms";
import { getRoomStore } from "$lib/server/rooms/runtime";

export const load: PageServerLoad = async ({ params, cookies }) => {
  const session = await requireProductRoomHostSession(cookies, params.roomId);
  const guestInvitePath = await getGuestInvitePathForHost(
    { hostAccountId: session.hostAccountId, roomId: params.roomId },
    { store: getRoomStore() },
  );

  return {
    roomId: params.roomId,
    guestInvitePath,
  };
};
