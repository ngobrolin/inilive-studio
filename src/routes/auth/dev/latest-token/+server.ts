import { json, type RequestHandler } from "@sveltejs/kit";
import { getCapturedMagicLinkEmails } from "$lib/server/auth/runtime";
import { env } from "$env/dynamic/private";

export const GET: RequestHandler = async ({ url }) => {
  if (env.DATABASE_URL) {
    return new Response(null, { status: 404 });
  }

  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? null;
  const sentEmails = getCapturedMagicLinkEmails();
  const latest = email
    ? sentEmails.filter((entry) => entry.email === email).at(-1) ?? null
    : (sentEmails.at(-1) ?? null);

  return json({ token: latest?.token ?? null });
};
