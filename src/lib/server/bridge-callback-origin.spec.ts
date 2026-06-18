import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearBridgeCallbackOrigin,
  configureBridgeCallbackOrigin,
  resolveBridgeCallbackOrigin,
} from "./bridge-callback-origin";

describe("resolveBridgeCallbackOrigin", () => {
  beforeEach(() => {
    configureBridgeCallbackOrigin(null);
  });

  afterEach(() => {
    clearBridgeCallbackOrigin();
  });

  it("uses the request origin when no callback origin is configured", () => {
    expect(resolveBridgeCallbackOrigin("http://127.0.0.1:4173")).toBe("http://127.0.0.1:4173");
  });

  it("prefers a configured callback origin for containerized bridge callbacks", () => {
    configureBridgeCallbackOrigin("http://host.containers.internal:4173");
    expect(resolveBridgeCallbackOrigin("http://127.0.0.1:4173")).toBe(
      "http://host.containers.internal:4173",
    );
  });
});
