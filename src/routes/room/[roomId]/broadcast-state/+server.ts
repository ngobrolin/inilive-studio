import { getRoomBroadcastView } from "$lib/server/broadcast-state";
import { getRoomPresence } from "$lib/server/room-presence";
import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = ({ params, url }) => {
  const roomId = params.roomId ?? "";
  const participantId = url.searchParams.get("participant") ?? "";
  const presence = getRoomPresence(roomId);
  const activeParticipant = presence.participants.find(
    (participant) => participant.id === participantId,
  );

  return json(
    getRoomBroadcastView(roomId, {
      includeHealth: activeParticipant?.role === "host",
    }),
  );
};
