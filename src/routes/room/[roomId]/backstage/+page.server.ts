import { createMediaJoinGrant } from "$lib/server/media-join";
import {
  getRoomChatMessages,
  getRoomPresence,
  postRoomChatMessage,
} from "$lib/server/room-presence";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, url }) => {
  const activeParticipantId = url.searchParams.get("participant") ?? "";
  const presence = getRoomPresence(params.roomId);
  const activeParticipant = presence.participants.find(
    (participant) => participant.id === activeParticipantId,
  );
  const mediaGrant = activeParticipant
    ? await createMediaJoinGrant({
        roomId: params.roomId,
        participantId: activeParticipant.id,
        displayName: activeParticipant.displayName,
        role: activeParticipant.role,
      })
    : null;

  return {
    presence,
    chatMessages: getRoomChatMessages(params.roomId),
    activeParticipantId,
    mediaGrant,
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
