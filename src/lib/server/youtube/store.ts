export type YouTubeOAuthState = {
  hostAccountId: string;
  state: string;
  expiresAt: Date;
};

export type YouTubeChannelLink = {
  hostAccountId: string;
  youtubeChannelId: string;
  youtubeChannelTitle: string;
  refreshTokenCiphertext: string;
};

export type YouTubeStore = {
  saveOAuthState(state: YouTubeOAuthState): Promise<void>;
  consumeOAuthState(state: string): Promise<YouTubeOAuthState | null>;
  saveChannelLink(link: YouTubeChannelLink): Promise<void>;
  getChannelLinkForHost(hostAccountId: string): Promise<YouTubeChannelLink | null>;
  deleteChannelLinkForHost(hostAccountId: string): Promise<void>;
};

export function createInMemoryYouTubeStore(): YouTubeStore {
  const states = new Map<string, YouTubeOAuthState>();
  const linksByHost = new Map<string, YouTubeChannelLink>();

  return {
    async saveOAuthState(state) {
      states.set(state.state, state);
    },

    async consumeOAuthState(state) {
      const saved = states.get(state) ?? null;
      if (!saved || saved.expiresAt.getTime() <= Date.now()) {
        return null;
      }

      states.delete(state);
      return saved;
    },

    async saveChannelLink(link) {
      linksByHost.set(link.hostAccountId, link);
    },

    async getChannelLinkForHost(hostAccountId) {
      return linksByHost.get(hostAccountId) ?? null;
    },

    async deleteChannelLinkForHost(hostAccountId) {
      linksByHost.delete(hostAccountId);
    },
  };
}
