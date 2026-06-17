import type { PageServerLoad } from "./$types";
import { requireProductRoomHostSession } from "$lib/server/rooms/require-host-session";

export const load: PageServerLoad = async ({ params, cookies }) => {
  await requireProductRoomHostSession(cookies, params.roomId);

  return {
    roomId: params.roomId,
  };
};
