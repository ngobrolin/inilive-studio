import { displayNameError } from "$lib/room/display-name";
import { registerRoomParticipant } from "$lib/server/room-presence";
import { requireProductRoomHostSession } from "$lib/server/rooms/require-host-session";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, cookies }) => {
  await requireProductRoomHostSession(cookies, params.roomId);

  return {
    roomId: params.roomId,
  };
};

export const actions: Actions = {
  default: async ({ params, request, cookies }) => {
    await requireProductRoomHostSession(cookies, params.roomId);

    const formData = await request.formData();
    const displayName = String(formData.get("displayName") ?? "");
    const error = displayNameError(displayName);

    if (error) {
      return fail(400, { error });
    }

    const result = registerRoomParticipant({
      roomId: params.roomId,
      displayName,
      role: "host",
      cameraEnabled: formData.get("cameraEnabled") === "true",
      microphoneEnabled: formData.get("microphoneEnabled") === "true",
    });

    redirect(303, `/room/${params.roomId}/backstage?participant=${result.participant?.id ?? ""}`);
  },
};
