import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearBridgeClientConfig,
  configureBridgeClient,
  forwardWhipIngest,
  startBridgeSession,
  stopBridgeSession,
} from "./bridge-client";

describe("bridge client", () => {
  afterEach(() => {
    clearBridgeClientConfig();
    vi.restoreAllMocks();
  });

  it("starts a bridge session with RTMP credentials on the control API", async () => {
    configureBridgeClient({ controlBaseUrl: "http://127.0.0.1:8787", enabled: true });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await startBridgeSession({
      roomId: "demo",
      rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
      streamKey: "secret-stream-key",
      callbackUrl: "http://localhost/bridge/demo/events",
      callbackBearerToken: "bridge_secret",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/sessions",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: "demo",
          rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
          streamKey: "secret-stream-key",
          callbackUrl: "http://localhost/bridge/demo/events",
          callbackBearerToken: "bridge_secret",
        }),
      }),
    );
  });

  it("forwards authenticated WHIP ingest to the bridge WHIP endpoint", async () => {
    configureBridgeClient({
      controlBaseUrl: "http://127.0.0.1:8787",
      whipBaseUrl: "http://127.0.0.1:8788",
      enabled: true,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("v=0\r\no=-", {
        status: 201,
        headers: { "Content-Type": "application/sdp", Location: "/whip/demo/resource" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await forwardWhipIngest({
      roomId: "demo",
      authorizationHeader: "Bearer whip_test",
      body: "v=0\r\no=-",
      contentType: "application/sdp",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8788/whip/demo",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer whip_test",
          "Content-Type": "application/sdp",
        },
        body: "v=0\r\no=-",
      }),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("Location")).toBe("/whip/demo/resource");
  });

  it("stops a bridge session when a Broadcast ends", async () => {
    configureBridgeClient({ controlBaseUrl: "http://127.0.0.1:8787", enabled: true });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await stopBridgeSession({ roomId: "demo" });

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/sessions/demo", {
      method: "DELETE",
    });
  });

  it("reports when the bridge control API is unreachable", async () => {
    configureBridgeClient({ controlBaseUrl: "http://127.0.0.1:8787", enabled: true });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(
      startBridgeSession({
        roomId: "demo",
        rtmpServerUrl: "rtmp://a.rtmp.youtube.com/live2",
        streamKey: "secret-stream-key",
        callbackUrl: "http://localhost/bridge/demo/events",
        callbackBearerToken: "bridge_secret",
      }),
    ).rejects.toThrow("Broadcast Bridge is not reachable at http://127.0.0.1:8787");
  });
});
