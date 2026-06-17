export type HostAccount = {
  id: string;
  email: string;
};

export type HostSession = {
  id: string;
  hostAccountId: string;
  tokenHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
};

export type MagicLinkToken = {
  id: string;
  hostAccountId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export type AuthStore = {
  findHostByEmail(email: string): Promise<HostAccount | null>;
  createHostAccount(email: string): Promise<HostAccount>;
  invalidateMagicLinksForHost(hostAccountId: string): Promise<void>;
  createMagicLink(hostAccountId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  exchangeMagicLinkToken(token: string): Promise<HostAccount | null>;
  invalidateHostSessions(hostAccountId: string): Promise<void>;
  createHostSession(
    hostAccountId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<HostSession>;
  findHostSession(token: string): Promise<(HostSession & { hostEmail: string }) | null>;
  touchHostSession(sessionId: string, lastSeenAt: Date): Promise<void>;
};

export function createInMemoryAuthStore(): AuthStore {
  const hosts = new Map<string, HostAccount>();
  const hostsById = new Map<string, HostAccount>();
  const magicLinks = new Map<string, MagicLinkToken>();
  const magicLinksByHash = new Map<string, MagicLinkToken>();
  const sessions = new Map<string, HostSession>();
  const sessionsByHash = new Map<string, HostSession>();
  let nextId = 1;

  function nextHostId() {
    return `host-${nextId++}`;
  }

  return {
    async findHostByEmail(email) {
      return hosts.get(email.trim().toLowerCase()) ?? null;
    },

    async createHostAccount(email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = hosts.get(normalizedEmail);
      if (existing) {
        return existing;
      }

      const host = { id: nextHostId(), email: normalizedEmail };
      hosts.set(normalizedEmail, host);
      hostsById.set(host.id, host);
      return host;
    },

    async invalidateMagicLinksForHost(hostAccountId) {
      for (const [hash, link] of magicLinksByHash.entries()) {
        if (link.hostAccountId === hostAccountId && !link.usedAt) {
          link.usedAt = new Date();
          magicLinksByHash.set(hash, link);
        }
      }
    },

    async createMagicLink(hostAccountId, tokenHash, expiresAt) {
      const link: MagicLinkToken = {
        id: `magic-${nextId++}`,
        hostAccountId,
        tokenHash,
        expiresAt,
        usedAt: null,
      };
      magicLinks.set(link.id, link);
      magicLinksByHash.set(tokenHash, link);
    },

    async exchangeMagicLinkToken(token) {
      const { hashToken } = await import("./tokens");
      const tokenHash = hashToken(token);
      const link = magicLinksByHash.get(tokenHash);
      if (!link || link.usedAt || link.expiresAt.getTime() <= Date.now()) {
        return null;
      }

      link.usedAt = new Date();
      magicLinksByHash.set(tokenHash, link);
      return hostsById.get(link.hostAccountId) ?? null;
    },

    async invalidateHostSessions(hostAccountId) {
      for (const [hash, session] of sessionsByHash.entries()) {
        if (session.hostAccountId === hostAccountId) {
          sessions.delete(session.id);
          sessionsByHash.delete(hash);
        }
      }
    },

    async createHostSession(hostAccountId, tokenHash, expiresAt) {
      const session: HostSession = {
        id: `session-${nextId++}`,
        hostAccountId,
        tokenHash,
        expiresAt,
        lastSeenAt: new Date(),
      };
      sessions.set(session.id, session);
      sessionsByHash.set(tokenHash, session);
      return session;
    },

    async findHostSession(token) {
      const { hashToken } = await import("./tokens");
      const session = sessionsByHash.get(hashToken(token));
      if (!session || session.expiresAt.getTime() <= Date.now()) {
        return null;
      }

      const host = hostsById.get(session.hostAccountId);
      if (!host) {
        return null;
      }

      return { ...session, hostEmail: host.email };
    },

    async touchHostSession(sessionId, lastSeenAt) {
      const session = sessions.get(sessionId);
      if (!session) {
        return;
      }

      session.lastSeenAt = lastSeenAt;
      sessions.set(sessionId, session);
      sessionsByHash.set(session.tokenHash, session);
    },
  };
}
