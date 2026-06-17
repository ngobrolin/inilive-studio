import { generateSecureToken, hashToken } from "./tokens";
import type { AuthStore } from "./store";

export const SESSION_ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_SLIDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE_NAME = "host_session";

export type SessionExchangeResult = {
  sessionToken: string | null;
  hostEmail: string | null;
  expiresAt: Date | null;
  error: "invalid_or_expired_token" | null;
};

export async function exchangeMagicLinkForSession(
  input: { token: string },
  deps: { store: AuthStore; now?: number },
): Promise<SessionExchangeResult> {
  const now = deps.now ?? Date.now();
  const host = await deps.store.exchangeMagicLinkToken(input.token);
  if (!host) {
    return {
      sessionToken: null,
      hostEmail: null,
      expiresAt: null,
      error: "invalid_or_expired_token",
    };
  }

  await deps.store.invalidateHostSessions(host.id);

  const sessionToken = `session_${generateSecureToken()}`;
  const expiresAt = new Date(now + SESSION_ABSOLUTE_TTL_MS);
  await deps.store.createHostSession(host.id, hashToken(sessionToken), expiresAt);

  return {
    sessionToken,
    hostEmail: host.email,
    expiresAt,
    error: null,
  };
}

export function buildHostSessionCookie(
  sessionToken: string,
  expiresAt: Date,
  input: { secure?: boolean } = {},
): string {
  const secure = input.secure ?? true;
  const maxAgeSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  return [
    `${SESSION_COOKIE_NAME}=${sessionToken}`,
    "Path=/",
    "HttpOnly",
    secure ? "Secure" : "",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearHostSessionCookie(input: { secure?: boolean } = {}): string {
  const secure = input.secure ?? true;

  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    secure ? "Secure" : "",
    "SameSite=Lax",
    "Max-Age=0",
  ]
    .filter(Boolean)
    .join("; ");
}

export async function resolveHostSession(
  sessionToken: string | undefined,
  deps: { store: AuthStore; now?: number },
): Promise<{ hostAccountId: string; hostEmail: string } | null> {
  if (!sessionToken) {
    return null;
  }

  const session = await deps.store.findHostSession(sessionToken);
  if (!session) {
    return null;
  }

  const now = deps.now ?? Date.now();
  const slidingExpiry = session.lastSeenAt.getTime() + SESSION_SLIDING_TTL_MS;
  if (slidingExpiry <= now || session.expiresAt.getTime() <= now) {
    return null;
  }

  await deps.store.touchHostSession(session.id, new Date(now));
  return {
    hostAccountId: session.hostAccountId,
    hostEmail: session.hostEmail,
  };
}
