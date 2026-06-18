import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: {
    command: "npm run build && npm run preview",
    port: 4173,
    // Keep e2e deterministic in stub mode. Real LiveKit credential
    // verification is the manual HITL step (media-001-live).
    env: {
      LIVEKIT_URL: "",
      LIVEKIT_API_KEY: "",
      LIVEKIT_API_SECRET: "",
      DATABASE_URL: "",
      BRIDGE_ENABLED: "",
    },
  },
  testMatch: "**/*.e2e.{ts,js}",
  use: {
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
  },
});
