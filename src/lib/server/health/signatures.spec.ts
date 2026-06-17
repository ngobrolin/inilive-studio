import { describe, expect, it } from "vitest";
import {
  buildBridgeHealthSignatureHeader,
  verifyBridgeHealthSignature,
} from "./signatures";

describe("bridge health HMAC signatures", () => {
  const secret = "bridge-hmac-secret";
  const body = JSON.stringify({ status: "connected", message: "Bridge connected." });

  it("accepts a valid HMAC-SHA256 signature for the request body", () => {
    const signatureHeader = buildBridgeHealthSignatureHeader(body, secret);

    expect(verifyBridgeHealthSignature({ body, signatureHeader, secret })).toBe(true);
  });

  it("rejects missing, malformed, or wrong signatures", () => {
    const signatureHeader = buildBridgeHealthSignatureHeader(body, secret);

    expect(verifyBridgeHealthSignature({ body, signatureHeader: null, secret })).toBe(false);
    expect(verifyBridgeHealthSignature({ body, signatureHeader: "sha256=deadbeef", secret })).toBe(
      false,
    );
    expect(
      verifyBridgeHealthSignature({ body, signatureHeader, secret: "wrong-secret" }),
    ).toBe(false);
    expect(
      verifyBridgeHealthSignature({
        body: JSON.stringify({ status: "failed" }),
        signatureHeader,
        secret,
      }),
    ).toBe(false);
  });
});
