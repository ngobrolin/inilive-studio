import { displayNameError } from "$lib/room/display-name";
import { registerRoomParticipant } from "$lib/server/room-presence";
import { validateGuestInvite } from "$lib/server/rooms/rooms";
import { getRoomStore } from "$lib/server/rooms/runtime";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

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

export const actions: Actions = {
  default: async ({ params, request }) => {
    const inviteStatus = await validateGuestInvite(
      { roomId: params.roomId, token: params.token },
      { store: getRoomStore() },
    );
    if (inviteStatus === "invalid") {
      return fail(403, { error: "invalid_invite" });
    }

    const formData = await request.formData();
    const displayName = String(formData.get("displayName") ?? "");
    const error = displayNameError(displayName);

    if (error) {
      return fail(400, { error });
    }

    const result = registerRoomParticipant({
      roomId: params.roomId,
      displayName,
      role: "guest",
      cameraEnabled: formData.get("cameraEnabled") === "true",
      microphoneEnabled: formData.get("microphoneEnabled") === "true",
    });

    if (result.roomFull) {
      redirect(303, `/room/${params.roomId}/full`);
    }

    redirect(303, `/room/${params.roomId}/backstage?participant=${result.participant?.id ?? ""}`);
  },
};
