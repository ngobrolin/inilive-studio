import { json, type RequestHandler } from "@sveltejs/kit";
import { getHostSessionFromCookies } from "$lib/server/auth/host-session";
import { createHostRoom } from "$lib/server/rooms/rooms";
import { getRoomStore } from "$lib/server/rooms/runtime";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const session = await getHostSessionFromCookies(cookies);
  if (!session) {
    return json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { title?: string } | null;
  const result = await createHostRoom(
    { hostAccountId: session.hostAccountId, title: body?.title ?? "" },
    { store: getRoomStore() },
  );

  if (!result.room) {
    return json({ ok: false, error: result.error }, { status: 400 });
  }

  return json({ ok: true, room: result.room }, { status: 201 });
};
