import { authorizeWhipIngest } from "$lib/server/broadcast-state";
import { ensureBridgeClientConfigured } from "$lib/server/bridge-env";
import { forwardWhipIngest } from "$lib/server/bridge-client";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params, request }) => {
  ensureBridgeClientConfigured();
  const authorization = authorizeWhipIngest({
    roomId: params.roomId,
    authorizationHeader: request.headers.get("Authorization"),
  });

  if (!authorization.authorized) {
    return new Response("Unauthorized", { status: authorization.status });
  }

  const authorizationHeader = request.headers.get("Authorization");
  if (!authorizationHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.text();
  const bridgeResponse = await forwardWhipIngest({
    roomId: params.roomId,
    authorizationHeader,
    body,
    contentType: request.headers.get("Content-Type") ?? "application/sdp",
  });

  const responseHeaders = new Headers();
  const location = bridgeResponse.headers.get("Location");
  const contentType = bridgeResponse.headers.get("Content-Type");

  if (location) {
    responseHeaders.set("Location", location);
  }
  if (contentType) {
    responseHeaders.set("Content-Type", contentType);
  }

  return new Response(await bridgeResponse.text(), {
    status: bridgeResponse.status,
    headers: responseHeaders,
  });
};
