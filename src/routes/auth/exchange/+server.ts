import { json, type RequestHandler } from "@sveltejs/kit";
import { buildHostSessionCookie, exchangeMagicLinkForSession } from "$lib/server/auth/sessions";
import { getAuthStore } from "$lib/server/auth/runtime";

export const POST: RequestHandler = async ({ request, url }) => {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const result = await exchangeMagicLinkForSession(
    { token: body?.token ?? "" },
    { store: getAuthStore() },
  );

  if (!result.sessionToken || !result.expiresAt) {
    return json({ ok: false, error: result.error }, { status: 401 });
  }

  const secure = url.protocol === "https:";
  return json(
    { ok: true, hostEmail: result.hostEmail },
    {
      status: 200,
      headers: {
        "Set-Cookie": buildHostSessionCookie(result.sessionToken, result.expiresAt, { secure }),
      },
    },
  );
};
