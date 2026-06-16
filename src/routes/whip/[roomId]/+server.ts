import { authorizeWhipIngest } from "$lib/server/broadcast-state";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params, request }) => {
  const authorization = authorizeWhipIngest({
    roomId: params.roomId,
    authorizationHeader: request.headers.get("Authorization"),
  });

  if (!authorization.authorized) {
    return new Response("Unauthorized", { status: authorization.status });
  }

  return new Response("WHIP ingest authenticated; bridge ingest is not wired yet.", {
    status: authorization.status,
  });
};
