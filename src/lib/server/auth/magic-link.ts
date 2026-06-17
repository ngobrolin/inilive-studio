import { generateSecureToken, hashToken } from "./tokens";
import type { AuthStore } from "./store";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

export const MAGIC_LINK_REQUEST_RESPONSE = {
  ok: true,
  message: "If that email can sign in, a magic link is on the way.",
} as const;

export type MagicLinkEmailSender = (input: { email: string; token: string }) => Promise<void>;

export async function requestMagicLink(
  input: { email: string },
  deps: { store: AuthStore; sendEmail: MagicLinkEmailSender },
): Promise<typeof MAGIC_LINK_REQUEST_RESPONSE> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return MAGIC_LINK_REQUEST_RESPONSE;
  }

  const host =
    (await deps.store.findHostByEmail(email)) ?? (await deps.store.createHostAccount(email));
  await deps.store.invalidateMagicLinksForHost(host.id);

  const token = generateSecureToken();
  await deps.store.createMagicLink(
    host.id,
    hashToken(token),
    new Date(Date.now() + MAGIC_LINK_TTL_MS),
  );
  await deps.sendEmail({ email: host.email, token });

  return MAGIC_LINK_REQUEST_RESPONSE;
}
