import { createHmac } from "node:crypto";

const healthStatuses = new Set(["connecting", "connected", "degraded", "ended", "failed"]);

function buildSignatureHeader(body, secret) {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

export function buildBroadcastHealthCallbackRequest({
  callbackUrl,
  callbackBearerToken,
  callbackHmacSecret,
  status,
  message,
}) {
  if (!callbackUrl || !callbackBearerToken || !callbackHmacSecret) {
    throw new Error(
      "Broadcast Health callback URL, bearer token, and HMAC secret are required.",
    );
  }

  if (!healthStatuses.has(status)) {
    throw new Error(`Unsupported Broadcast Health status: ${status}`);
  }

  const body = JSON.stringify({ status, message });

  return [
    callbackUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${callbackBearerToken}`,
        "Content-Type": "application/json",
        "X-Bridge-Signature": buildSignatureHeader(body, callbackHmacSecret),
      },
      body,
    },
  ];
}

export async function sendBroadcastHealthCallback(input, fetchImpl = fetch) {
  const [url, options] = buildBroadcastHealthCallbackRequest(input);
  const response = await fetchImpl(url, options);

  if (!response.ok) {
    throw new Error(`Broadcast Health callback failed with status ${response.status}`);
  }
}
