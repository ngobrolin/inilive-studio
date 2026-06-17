import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTE_LENGTH = 32;

export function generateSecureToken(): string {
  return randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
