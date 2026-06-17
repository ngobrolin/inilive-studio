import { createHmac, timingSafeEqual } from "node:crypto";

const signaturePrefix = "sha256=";

export function buildBridgeHealthSignatureHeader(body: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `${signaturePrefix}${digest}`;
}

export function verifyBridgeHealthSignature(input: {
  body: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!input.signatureHeader?.startsWith(signaturePrefix)) {
    return false;
  }

  const provided = input.signatureHeader.slice(signaturePrefix.length);
  const expected = createHmac("sha256", input.secret).update(input.body).digest("hex");

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
}
