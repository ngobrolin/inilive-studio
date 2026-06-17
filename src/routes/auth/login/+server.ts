import { json, type RequestHandler } from "@sveltejs/kit";
import { requestMagicLink } from "$lib/server/auth/magic-link";
import { getAuthStore, getMagicLinkEmailSender } from "$lib/server/auth/runtime";

export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;

  const response = await requestMagicLink(
    { email: body?.email ?? "" },
    {
      store: getAuthStore(),
      sendEmail: getMagicLinkEmailSender(),
    },
  );

  return json(response, { status: 202 });
};
