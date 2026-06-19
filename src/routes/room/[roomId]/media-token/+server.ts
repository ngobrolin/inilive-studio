import { json, type RequestHandler } from "@sveltejs/kit";
import { refreshActiveParticipantMediaGrant } from "$lib/server/media-join";

export const GET: RequestHandler = async ({ params, url }) => {
  const roomId = params.roomId ?? "";
  const participantId = url.searchParams.get("participant") ?? "";
  const grant = await refreshActiveParticipantMediaGrant({ roomId, participantId });

  if (!grant || grant.stub) {
    return json({ error: "Participant media grant is unavailable." }, { status: 404 });
  }

  return json({
    token: grant.token,
    serverUrl: grant.serverUrl,
    expiresAt: grant.expiresAt,
    participantIdentity: grant.participantIdentity,
    displayName: grant.displayName,
    role: grant.role,
    roomName: grant.roomName,
  });
};
