import { createMediaJoinGrant } from "$lib/server/media-join";
import { ensureBridgeClientConfigured } from "$lib/server/bridge-env";
import {
  startBridgeSession,
  stopBridgeSession,
} from "$lib/server/bridge-client";
import {
  endRoomBroadcast,
  failRoomBroadcast,
  getRoomBroadcastIngestGrant,
  getRoomBroadcastView,
  startRoomBroadcast,
} from "$lib/server/broadcast-state";
import {
  getRoomChatMessages,
  getRoomPresence,
  moderateRoomParticipant,
  postRoomChatMessage,
  respondToHostUnmuteRequest,
  startRoomScreenShare,
  stopRoomScreenShare,
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
    broadcast: getRoomBroadcastView(params.roomId),
    hostWhipIngestGrant:
      activeParticipant?.role === "host" ? getRoomBroadcastIngestGrant(params.roomId) : null,
  };
};

export const actions: Actions = {
  chat: async ({ params, request }) => {
    const formData = await request.formData();
    const participantId = String(formData.get("participantId") ?? "");
    const text = String(formData.get("messageText") ?? "");
    const result = postRoomChatMessage({ roomId: params.roomId, participantId, text });

    if (result.error) {
      return fail(400, { error: result.error });
    }

    redirect(303, `/room/${params.roomId}/backstage?participant=${participantId}`);
  },
  moderate: async ({ params, request }) => {
    const formData = await request.formData();
    const hostParticipantId = String(formData.get("hostParticipantId") ?? "");
    const guestParticipantId = String(formData.get("guestParticipantId") ?? "");
    const action = String(formData.get("moderationAction") ?? "");

    if (
      action !== "force-mute" &&
      action !== "force-camera-off" &&
      action !== "request-unmute" &&
      action !== "remove"
    ) {
      return fail(400, { error: "Choose a moderation action." });
    }

    const result = moderateRoomParticipant({
      roomId: params.roomId,
      hostParticipantId,
      guestParticipantId,
      action,
    });

    if (result.error) {
      return fail(400, { error: result.error });
    }

    redirect(303, `/room/${params.roomId}/backstage?participant=${hostParticipantId}`);
  },
  unmute: async ({ params, request }) => {
    const formData = await request.formData();
    const participantId = String(formData.get("participantId") ?? "");
    const accepted = formData.get("unmuteResponse") === "accept";
    const result = respondToHostUnmuteRequest({ roomId: params.roomId, participantId, accepted });

    if (result.error) {
      return fail(400, { error: result.error });
    }

    redirect(303, `/room/${params.roomId}/backstage?participant=${participantId}`);
  },
  screenShare: async ({ params, request }) => {
    const formData = await request.formData();
    const participantId = String(formData.get("participantId") ?? "");
    const action = String(formData.get("screenShareAction") ?? "");
    const result =
      action === "start"
        ? startRoomScreenShare({ roomId: params.roomId, participantId })
        : stopRoomScreenShare({ roomId: params.roomId, participantId });

    if (result.error) {
      return fail(400, { error: result.error });
    }

    redirect(303, `/room/${params.roomId}/backstage?participant=${participantId}`);
  },
  broadcast: async ({ params, request }) => {
    ensureBridgeClientConfigured();
    const formData = await request.formData();
    const hostParticipantId = String(formData.get("hostParticipantId") ?? "");
    const action = String(formData.get("broadcastAction") ?? "");

    if (action === "start") {
      const rtmpServerUrl = String(formData.get("rtmpServerUrl") ?? "");
      const streamKey = String(formData.get("streamKey") ?? "");
      const result = startRoomBroadcast({
        roomId: params.roomId,
        hostParticipantId,
        rtmpServerUrl,
        streamKey,
      });

      if (result.error) {
        return fail(400, { error: result.error });
      }

      try {
        await startBridgeSession({
          roomId: params.roomId,
          rtmpServerUrl,
          streamKey,
        });
      } catch (error) {
        failRoomBroadcast({
          roomId: params.roomId,
          failureMessage: "The Broadcast Bridge could not start for this Room.",
        });
        return fail(500, {
          error: error instanceof Error ? error.message : "Broadcast Bridge start failed.",
        });
      }
    } else if (action === "end") {
      const result = endRoomBroadcast({
        roomId: params.roomId,
        hostParticipantId,
      });

      if (result.error) {
        return fail(400, { error: result.error });
      }

      await stopBridgeSession({ roomId: params.roomId });
    } else if (action === "simulate-fail") {
      const result = failRoomBroadcast({
        roomId: params.roomId,
        failureMessage: "YouTube rejected the stream credentials.",
      });

      if (result.error) {
        return fail(400, { error: result.error });
      }

      await stopBridgeSession({ roomId: params.roomId });
    } else {
      return fail(400, { error: "Choose a Broadcast action." });
    }

    redirect(303, `/room/${params.roomId}/backstage?participant=${hostParticipantId}`);
  },
};
