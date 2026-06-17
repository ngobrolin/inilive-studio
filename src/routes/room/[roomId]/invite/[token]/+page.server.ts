import type { PageServerLoad } from "./$types";
import { validateGuestInvite } from "$lib/server/rooms/rooms";
import { getRoomStore } from "$lib/server/rooms/runtime";

export const load: PageServerLoad = async ({ params }) => {
  const inviteStatus = await validateGuestInvite(
    { roomId: params.roomId, token: params.token },
    { store: getRoomStore() },
  );

  return {
    roomId: params.roomId,
    inviteToken: params.token,
    inviteStatus,
  };
};
