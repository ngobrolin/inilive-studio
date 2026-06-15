import { getRoomPresence } from "$lib/server/room-presence";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
  return getRoomPresence(params.roomId);
};
