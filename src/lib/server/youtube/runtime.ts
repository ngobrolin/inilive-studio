import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "$env/dynamic/private";
import { generateSecureToken } from "$lib/server/auth/tokens";
import { createDatabase } from "$lib/server/db/database";
import { createPostgresYouTubeStore } from "./postgres-store";
import { createInMemoryYouTubeStore, type YouTubeStore } from "./store";

export type GoogleYouTubeClient = {
  exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string | null }>;
  getOwnChannel(accessToken: string): Promise<{ id: string; title: string }>;
  refreshAccessToken(refreshToken: string): Promise<string>;
};

let youtubeStore: YouTubeStore | null = null;
let inMemoryYouTubeStore: YouTubeStore | null = null;
let googleClient: GoogleYouTubeClient | null = null;
let refreshTokenEncrypter: ((refreshToken: string) => string) | null = null;
let refreshTokenDecrypter: ((refreshTokenCiphertext: string) => string) | null = null;

export function getYouTubeStore(): YouTubeStore {
  if (youtubeStore) {
    return youtubeStore;
  }

  if (!env.DATABASE_URL) {
    inMemoryYouTubeStore ??= createInMemoryYouTubeStore();
    return inMemoryYouTubeStore;
  }

  return createPostgresYouTubeStore(createDatabase(env.DATABASE_URL));
}

export function getYouTubeOAuthConfig() {
  return {
    clientId: env.GOOGLE_CLIENT_ID ?? "dev-google-client-id",
    redirectUri: `${env.APP_ORIGIN ?? "http://localhost"}/youtube/callback`,
    createState: generateSecureToken,
  };
}

export function getGoogleYouTubeClient(): GoogleYouTubeClient {
  if (googleClient) {
    return googleClient;
  }

  return {
    async exchangeCode(code) {
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      if (!clientSecret) {
        throw new Error("GOOGLE_CLIENT_SECRET is required for YouTube OAuth callback");
      }

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: getYouTubeOAuthConfig().clientId,
          client_secret: clientSecret,
          redirect_uri: getYouTubeOAuthConfig().redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        throw new Error("Google OAuth token exchange failed");
      }

      const body = (await response.json()) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (!body.access_token) {
        throw new Error("Google OAuth token response did not include an access token");
      }

      return { accessToken: body.access_token, refreshToken: body.refresh_token ?? null };
    },
    async getOwnChannel(accessToken) {
      const response = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!response.ok) {
        throw new Error("Google YouTube channel lookup failed");
      }

      const body = (await response.json()) as {
        items?: Array<{ id?: string; snippet?: { title?: string } }>;
      };
      const channel = body.items?.[0];
      if (!channel?.id || !channel.snippet?.title) {
        throw new Error("Google YouTube channel response did not include a channel");
      }

      return { id: channel.id, title: channel.snippet.title };
    },
    async refreshAccessToken(refreshToken) {
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      if (!clientSecret) {
        throw new Error("GOOGLE_CLIENT_SECRET is required to refresh a YouTube access token");
      }

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: getYouTubeOAuthConfig().clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Google OAuth access-token refresh failed");
      }

      const body = (await response.json()) as { access_token?: string };
      if (!body.access_token) {
        throw new Error("Google OAuth refresh response did not include an access token");
      }

      return body.access_token;
    },
  };
}

export function encryptYouTubeRefreshToken(refreshToken: string): string {
  if (refreshTokenEncrypter) {
    return refreshTokenEncrypter(refreshToken);
  }

  if (env.YOUTUBE_REFRESH_TOKEN_ENCRYPTION_KEY) {
    const key = Buffer.from(env.YOUTUBE_REFRESH_TOKEN_ENCRYPTION_KEY, "base64");
    if (key.byteLength !== 32) {
      throw new Error("YOUTUBE_REFRESH_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `aes-256-gcm:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
  }

  if (env.DATABASE_URL) {
    throw new Error("YOUTUBE_REFRESH_TOKEN_ENCRYPTION_KEY is required when DATABASE_URL is set");
  }

  return `dev-encrypted:${refreshToken}`;
}

export function decryptYouTubeRefreshToken(refreshTokenCiphertext: string): string {
  if (refreshTokenDecrypter) {
    return refreshTokenDecrypter(refreshTokenCiphertext);
  }

  if (refreshTokenCiphertext.startsWith("dev-encrypted:") && !env.DATABASE_URL) {
    return refreshTokenCiphertext.slice("dev-encrypted:".length);
  }

  const keyValue = env.YOUTUBE_REFRESH_TOKEN_ENCRYPTION_KEY;
  if (!keyValue) {
    throw new Error("YOUTUBE_REFRESH_TOKEN_ENCRYPTION_KEY is required to decrypt refresh tokens");
  }

  const [algorithm, ivValue, tagValue, ciphertextValue] = refreshTokenCiphertext.split(":");
  if (algorithm !== "aes-256-gcm" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Stored YouTube refresh token has an invalid format");
  }

  const key = Buffer.from(keyValue, "base64");
  if (key.byteLength !== 32) {
    throw new Error("YOUTUBE_REFRESH_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function setYouTubeStoreForTests(store: YouTubeStore | null) {
  youtubeStore = store;
}

export function setYouTubeRuntimeForTests(input: {
  store?: YouTubeStore | null;
  googleClient?: GoogleYouTubeClient | null;
  encryptRefreshToken?: ((refreshToken: string) => string) | null;
  decryptRefreshToken?: ((refreshTokenCiphertext: string) => string) | null;
}) {
  youtubeStore = input.store ?? null;
  googleClient = input.googleClient ?? null;
  refreshTokenEncrypter = input.encryptRefreshToken ?? null;
  refreshTokenDecrypter = input.decryptRefreshToken ?? null;
}

export function clearYouTubeRuntimeForTests() {
  youtubeStore = null;
  googleClient = null;
  refreshTokenEncrypter = null;
  refreshTokenDecrypter = null;
}
