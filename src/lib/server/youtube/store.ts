export type YouTubeOAuthState = {
  hostAccountId: string;
  state: string;
  expiresAt: Date;
};

export type YouTubeStore = {
  saveOAuthState(state: YouTubeOAuthState): Promise<void>;
};

export function createInMemoryYouTubeStore(): YouTubeStore {
  const states = new Map<string, YouTubeOAuthState>();

  return {
    async saveOAuthState(state) {
      states.set(state.state, state);
    },
  };
}
