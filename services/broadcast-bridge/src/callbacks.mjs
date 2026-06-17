const healthStatuses = new Set(["connecting", "connected", "degraded", "ended", "failed"]);

export function buildBroadcastHealthCallbackRequest({
  callbackUrl,
  callbackBearerToken,
  status,
  message,
}) {
  if (!callbackUrl || !callbackBearerToken) {
    throw new Error("Broadcast Health callback URL and bearer token are required.");
  }

  if (!healthStatuses.has(status)) {
    throw new Error(`Unsupported Broadcast Health status: ${status}`);
  }

  return [
    callbackUrl,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${callbackBearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, message }),
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
