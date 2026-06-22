import {
  getRoomManagedYouTubeBroadcast,
  getRoomProductBroadcastId,
  recordBridgeBroadcastHealth,
  type BroadcastHealthStatus,
} from "$lib/server/broadcast-state";
import { syncProductBroadcastTerminalState } from "$lib/server/broadcasts/broadcasts";
import { getBroadcastStore } from "$lib/server/broadcasts/runtime";
import { readBridgeCallbackHmacSecret } from "$lib/server/health/callback-secret";
import { recordBroadcastHealthEvent } from "$lib/server/health/health";
import { getHealthEventStore } from "$lib/server/health/runtime";
import { verifyBridgeHealthSignature } from "$lib/server/health/signatures";
import {
  completeManagedYouTubeBroadcast,
  transitionManagedYouTubeBroadcastLive,
} from "$lib/server/youtube/managed-broadcast";
import type { RequestHandler } from "./$types";

const healthStatuses = new Set<BroadcastHealthStatus>([
  "connecting",
  "connected",
  "degraded",
  "ended",
  "failed",
]);

export const POST: RequestHandler = async ({ params, request }) => {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("X-Bridge-Signature");

  if (
    !verifyBridgeHealthSignature({
      body: rawBody,
      signatureHeader,
      secret: readBridgeCallbackHmacSecret(),
    })
  ) {
    return new Response("Invalid Broadcast Health signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody || "{}") as { status?: string; message?: string };
  const status = typeof payload.status === "string" ? payload.status : "";

  if (!healthStatuses.has(status as BroadcastHealthStatus)) {
    return new Response("Invalid Broadcast Health status", { status: 400 });
  }

  const message = typeof payload.message === "string" ? payload.message : undefined;
  const managedBroadcast = getRoomManagedYouTubeBroadcast(params.roomId);
  const result = recordBridgeBroadcastHealth({
    roomId: params.roomId,
    authorizationHeader: request.headers.get("Authorization"),
    status: status as BroadcastHealthStatus,
    message,
  });

  if (result.error) {
    return new Response(result.error, { status: result.status });
  }

  const productBroadcastId = getRoomProductBroadcastId(params.roomId);
  if (productBroadcastId) {
    await recordBroadcastHealthEvent(
      {
        broadcastId: productBroadcastId,
        status: status as BroadcastHealthStatus,
        message: message ?? null,
        payload: {
          status,
          ...(message ? { message } : {}),
        },
      },
      { store: getHealthEventStore() },
    );
  }

  if (status === "failed" || status === "ended") {
    await syncProductBroadcastTerminalState(
      {
        productBroadcastId,
        state: status,
        failureMessage: status === "failed" ? (message ?? null) : null,
      },
      { store: getBroadcastStore() },
    );
    if (status === "ended" && managedBroadcast) {
      await completeManagedYouTubeBroadcast(managedBroadcast);
    }
  }

  if (status === "connected") {
    if (managedBroadcast) {
      try {
        await transitionManagedYouTubeBroadcastLive(managedBroadcast);
      } catch {
        const failureMessage = "YouTube did not transition the managed Broadcast to live.";
        recordBridgeBroadcastHealth({
          roomId: params.roomId,
          authorizationHeader: request.headers.get("Authorization"),
          status: "failed",
          message: failureMessage,
        });
        if (productBroadcastId) {
          await syncProductBroadcastTerminalState(
            {
              productBroadcastId,
              state: "failed",
              failureMessage,
            },
            { store: getBroadcastStore() },
          );
        }
      }
    }
  }

  return new Response(null, { status: result.status });
};
