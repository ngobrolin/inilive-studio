import {
  getRoomChatMessages,
  getRoomPresence,
  postRoomChatMessage,
} from "$lib/server/room-presence";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params, url }) => {
  const activeParticipantId = url.searchParams.get("participant") ?? "";

  return {
    presence: getRoomPresence(params.roomId),
    chatMessages: getRoomChatMessages(params.roomId),
    activeParticipantId,
  };
};

export const actions: Actions = {
  default: async ({ params, request }) => {
    const formData = await request.formData();
    const participantId = String(formData.get("participantId") ?? "");
    const text = String(formData.get("messageText") ?? "");
    const result = postRoomChatMessage({ roomId: params.roomId, participantId, text });

    if (result.error) {
      return fail(400, { error: result.error });
    }

    redirect(303, `/room/${params.roomId}/backstage?participant=${participantId}`);
  },
};
