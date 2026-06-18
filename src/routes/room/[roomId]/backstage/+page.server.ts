import { createMediaJoinGrant } from "$lib/server/media-join";
import { ensureBridgeClientConfigured } from "$lib/server/bridge-env";
import { resolveBridgeCallbackOrigin } from "$lib/server/bridge-callback-origin";
import { startBridgeSession, stopBridgeSession } from "$lib/server/bridge-client";
import {
  cancelBroadcastCountdown,
  completeBroadcastCountdown,
  recoverInterruptedBroadcast,
  startBroadcastCountdown,
  syncProductBroadcastTerminalState,
} from "$lib/server/broadcasts/broadcasts";
import { getBroadcastStore } from "$lib/server/broadcasts/runtime";
import {
  cancelRoomBroadcastCountdown,
  completeRoomBroadcastCountdown,
  endRoomBroadcast,
  failRoomBroadcast,
  getRoomBroadcastCallbackGrant,
  getRoomBroadcastCredentials,
  getRoomBroadcastIngestGrant,
  getRoomBroadcastView,
  getRoomProductBroadcastId,
  startRoomBroadcast,
  startRoomBroadcastCountdown,
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
import { getRoomStore } from "$lib/server/rooms/runtime";
import { getGuestInvitePathForHost } from "$lib/server/rooms/rooms";
import { getHostSessionFromCookies } from "$lib/server/auth/host-session";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

async function isProductRoom(roomId: string): Promise<boolean> {
  return getRoomStore().roomExists(roomId);
}

async function startBridgeForRoom(input: {
  roomId: string;
  rtmpServerUrl: string;
  streamKey: string;
  origin: string;
}) {
  const callbackGrant = getRoomBroadcastCallbackGrant(input.roomId);
  if (!callbackGrant) {
    throw new Error("Broadcast Bridge callback grant was not created.");
  }

  await startBridgeSession({
    roomId: input.roomId,
    rtmpServerUrl: input.rtmpServerUrl,
    streamKey: input.streamKey,
    callbackUrl: new URL(callbackGrant.callbackUrl, resolveBridgeCallbackOrigin(input.origin)).toString(),
    callbackBearerToken: callbackGrant.bearerToken,
  });
}

export const load: PageServerLoad = async ({ params, url, cookies }) => {
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

  const productRoom = await isProductRoom(params.roomId);
  const hostSession = await getHostSessionFromCookies(cookies);
  const guestInvitePath =
    productRoom && activeParticipant?.role === "host" && hostSession
      ? await getGuestInvitePathForHost(
          { hostAccountId: hostSession.hostAccountId, roomId: params.roomId },
          { store: getRoomStore() },
        )
      : null;

  return {
    presence,
    chatMessages: getRoomChatMessages(params.roomId),
    activeParticipantId,
    mediaGrant,
    broadcast: getRoomBroadcastView(params.roomId, {
      includeHealth: activeParticipant?.role === "host",
    }),
    hostWhipIngestGrant:
      activeParticipant?.role === "host" ? getRoomBroadcastIngestGrant(params.roomId) : null,
    isProductRoom: productRoom,
    guestInvitePath,
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
  broadcast: async ({ params, request, url }) => {
    ensureBridgeClientConfigured();
    const formData = await request.formData();
    const hostParticipantId = String(formData.get("hostParticipantId") ?? "");
    const action = String(formData.get("broadcastAction") ?? "");
    const productRoom = await isProductRoom(params.roomId);
    const broadcastStore = getBroadcastStore();

    if (action === "start") {
      const rtmpServerUrl = String(formData.get("rtmpServerUrl") ?? "");
      const streamKey = String(formData.get("streamKey") ?? "");

      if (productRoom) {
        const runtimeBroadcast = getRoomBroadcastView(params.roomId);
        await recoverInterruptedBroadcast(
          {
            roomId: params.roomId,
            hasActiveRuntimeBroadcast:
              runtimeBroadcast.state === "countdown" || runtimeBroadcast.state === "broadcasting",
          },
          { store: broadcastStore },
        );
        const countdown = await startBroadcastCountdown({ roomId: params.roomId }, { store: broadcastStore });
        if (countdown.error) {
          return fail(400, { error: "A Broadcast is already active in this Room." });
        }

        const result = startRoomBroadcastCountdown({
          roomId: params.roomId,
          hostParticipantId,
          rtmpServerUrl,
          streamKey,
          countdownEndsAt: countdown.broadcast!.countdownEndsAt!.getTime(),
          productBroadcastId: countdown.broadcast!.id,
        });

        if (result.error) {
          await cancelBroadcastCountdown(
            { broadcastId: countdown.broadcast!.id },
            { store: broadcastStore },
          );
          return fail(400, { error: result.error });
        }

        redirect(303, `/room/${params.roomId}/backstage?participant=${hostParticipantId}`);
      }

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
        await startBridgeForRoom({
          roomId: params.roomId,
          rtmpServerUrl,
          streamKey,
          origin: url.origin,
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
    } else if (action === "cancel-countdown") {
      const productBroadcastId = getRoomProductBroadcastId(params.roomId);
      const result = cancelRoomBroadcastCountdown({
        roomId: params.roomId,
        hostParticipantId,
      });

      if (result.error) {
        return fail(400, { error: result.error });
      }

      if (productBroadcastId) {
        await cancelBroadcastCountdown({ broadcastId: productBroadcastId }, { store: broadcastStore });
      }
    } else if (action === "complete-countdown") {
      const currentBroadcast = getRoomBroadcastView(params.roomId);
      if (currentBroadcast.state === "broadcasting") {
        redirect(303, `/room/${params.roomId}/backstage?participant=${hostParticipantId}`);
      }

      const productBroadcastId = getRoomProductBroadcastId(params.roomId);

      if (productBroadcastId) {
        const persisted = await completeBroadcastCountdown(
          { broadcastId: productBroadcastId },
          { store: broadcastStore },
        );
        if (persisted.error) {
          return fail(400, { error: "Broadcast Countdown is not ready to complete yet." });
        }
      }

      const result = completeRoomBroadcastCountdown({ roomId: params.roomId });
      if (result.error) {
        return fail(400, { error: result.error });
      }

      const credentials = getRoomBroadcastCredentials(params.roomId);
      if (!credentials) {
        return fail(500, { error: "Broadcast credentials were not available after Countdown." });
      }

      try {
        await startBridgeForRoom({
          roomId: params.roomId,
          rtmpServerUrl: credentials.rtmpServerUrl,
          streamKey: credentials.streamKey,
          origin: url.origin,
        });
      } catch (error) {
        failRoomBroadcast({
          roomId: params.roomId,
          failureMessage: "The Broadcast Bridge could not start for this Room.",
        });
        await syncProductBroadcastTerminalState(
          {
            productBroadcastId,
            state: "failed",
            failureMessage: "The Broadcast Bridge could not start for this Room.",
          },
          { store: broadcastStore },
        );
        return fail(500, {
          error: error instanceof Error ? error.message : "Broadcast Bridge start failed.",
        });
      }
    } else if (action === "end") {
      const productBroadcastId = getRoomProductBroadcastId(params.roomId);
      const result = endRoomBroadcast({
        roomId: params.roomId,
        hostParticipantId,
      });

      if (result.error) {
        return fail(400, { error: result.error });
      }

      await syncProductBroadcastTerminalState(
        { productBroadcastId, state: "ended" },
        { store: broadcastStore },
      );
      await stopBridgeSession({ roomId: params.roomId });
    } else if (action === "simulate-fail") {
      const productBroadcastId = getRoomProductBroadcastId(params.roomId);
      const failureMessage = "YouTube rejected the stream credentials.";
      const result = failRoomBroadcast({
        roomId: params.roomId,
        failureMessage,
      });

      if (result.error) {
        return fail(400, { error: result.error });
      }

      await syncProductBroadcastTerminalState(
        { productBroadcastId, state: "failed", failureMessage },
        { store: broadcastStore },
      );
      await stopBridgeSession({ roomId: params.roomId });
    } else {
      return fail(400, { error: "Choose a Broadcast action." });
    }

    redirect(303, `/room/${params.roomId}/backstage?participant=${hostParticipantId}`);
  },
};
