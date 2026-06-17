import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildBroadcastHealthCallbackRequest, sendBroadcastHealthCallback } from "./callbacks.mjs";

function buildSignatureHeader(body, secret) {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

describe("Broadcast Health callbacks", () => {
  it("builds an HMAC-signed JSON callback request without stream credentials", () => {
    const body = JSON.stringify({
      status: "failed",
      message: "RTMP output disconnected.",
    });
    const [, options] = buildBroadcastHealthCallbackRequest({
      callbackUrl: "http://localhost/bridge/demo/events",
      callbackBearerToken: "bridge_secret",
      callbackHmacSecret: "bridge-hmac-secret",
      status: "failed",
      message: "RTMP output disconnected.",
    });

    expect(options).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer bridge_secret",
        "Content-Type": "application/json",
        "X-Bridge-Signature": buildSignatureHeader(body, "bridge-hmac-secret"),
      },
      body,
    });
    expect(options.body).not.toContain("stream-key");
  });

  it("delivers the callback and fails when SvelteKit rejects it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));

    await sendBroadcastHealthCallback(
      {
        callbackUrl: "http://localhost/bridge/demo/events",
        callbackBearerToken: "bridge_secret",
        callbackHmacSecret: "bridge-hmac-secret",
        status: "connected",
        message: "Broadcast Bridge is connected.",
      },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/bridge/demo/events",
      expect.objectContaining({ method: "POST" }),
    );

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(
      sendBroadcastHealthCallback(
        {
          callbackUrl: "http://localhost/bridge/demo/events",
          callbackBearerToken: "bridge_secret",
          callbackHmacSecret: "bridge-hmac-secret",
          status: "connected",
          message: "Broadcast Bridge is connected.",
        },
        fetchMock,
      ),
    ).rejects.toThrow("Broadcast Health callback failed with status 401");
  });
});
