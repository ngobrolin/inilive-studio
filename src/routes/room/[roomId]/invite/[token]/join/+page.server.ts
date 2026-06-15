import { displayNameError } from "$lib/room/display-name";
import { registerRoomParticipant } from "$lib/server/room-presence";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
  return {
    roomId: params.roomId,
    inviteToken: params.token,
  };
};

export const actions: Actions = {
  default: async ({ params, request }) => {
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

    redirect(303, `/room/${params.roomId}/backstage`);
  },
};
