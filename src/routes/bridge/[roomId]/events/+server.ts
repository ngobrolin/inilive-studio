import {
  recordBridgeBroadcastHealth,
  type BroadcastHealthStatus,
} from "$lib/server/broadcast-state";
import type { RequestHandler } from "./$types";

const healthStatuses = new Set<BroadcastHealthStatus>([
  "connecting",
  "connected",
  "degraded",
  "ended",
  "failed",
]);

export const POST: RequestHandler = async ({ params, request }) => {
  const payload = await request.json().catch(() => null);
  const status = typeof payload?.status === "string" ? payload.status : "";

  if (!healthStatuses.has(status as BroadcastHealthStatus)) {
    return new Response("Invalid Broadcast Health status", { status: 400 });
  }

  const result = recordBridgeBroadcastHealth({
    roomId: params.roomId,
    authorizationHeader: request.headers.get("Authorization"),
    status: status as BroadcastHealthStatus,
    message: typeof payload?.message === "string" ? payload.message : undefined,
  });

  if (result.error) {
    return new Response(result.error, { status: result.status });
  }

  return new Response(null, { status: result.status });
};
