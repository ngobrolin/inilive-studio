import { json, type RequestHandler } from "@sveltejs/kit";
import { clearHostSessionCookie } from "$lib/server/auth/sessions";

export const POST: RequestHandler = async ({ url }) => {
  const secure = url.protocol === "https:";

  return json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": clearHostSessionCookie({ secure }),
      },
    },
  );
};
