import { json, type RequestHandler } from "@sveltejs/kit";
import { getHostSessionFromCookies } from "$lib/server/auth/host-session";
import { regenerateGuestInvite } from "$lib/server/rooms/rooms";
import { getRoomStore } from "$lib/server/rooms/runtime";

export const POST: RequestHandler = async ({ params, request, cookies }) => {
  if (!params.roomId) {
    return json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const session = await getHostSessionFromCookies(cookies);
  if (!session) {
    return json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== "regenerate") {
    return json({ ok: false, error: "invalid_action" }, { status: 400 });
  }

  const result = await regenerateGuestInvite(
    { hostAccountId: session.hostAccountId, roomId: params.roomId },
    { store: getRoomStore() },
  );

  if (result.error) {
    return json({ ok: false, error: result.error }, { status: 404 });
  }

  return json({ ok: true, guestInviteToken: result.guestInviteToken });
};
