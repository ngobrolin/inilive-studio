# Managed SFU spike (media-001)

Decision: **LiveKit Cloud** (confirmed 2026-06-15 after inLive shutdown).

## Timeline

1. 2026-06-15: Evaluated inLive Hub against four success criteria; initial HITL selection was inLive.
2. 2026-06-15: inLive is shutting down; switched to LiveKit Cloud per ADR 0022 fallback path.
3. 2026-06-15: Doc review passed; **live triage still required** before treating media-002 as validated.

## Doc review (complete)

These criteria were verified from LiveKit docs and the minimal server token path in this repo. They justify selecting LiveKit over inLive, but they are **not** a substitute for live triage.

| Criterion | Doc review | Evidence |
| --- | --- | --- |
| Multi-participant Room API | Pass | Room-scoped join tokens for small Rooms: https://docs.livekit.io/home/get-started/authentication/ |
| Screen Share support | Pass | `TrackSource.SCREEN_SHARE` publish grants: https://docs.livekit.io/home/client/tracks/screenshare/ |
| Per-participant access tokens | Pass | Server-issued JWTs via `livekit-server-sdk`: https://docs.livekit.io/home/get-started/authentication/ |
| Node-compatible server SDK | Pass | `livekit-server-sdk` in `src/lib/server/livekit-hub.ts` |

## Live triage (passed 2026-06-16)

Run this with real LiveKit Cloud credentials before marking media-001 fully closed or media-002 as production-ready.

| Step | Status | What to verify |
| --- | --- | --- |
| 1. Token smoke | Pass | With `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` set in `.env`, Backstage connected with a non-stub grant and showed `Connected · LiveKit`. |
| 2. Two-participant connect | Pass | Session 013 real Chromium check: Host and Guest joined the same LiveKit Room and each rendered the other's remote tile. Screenshots: `/tmp/inilive-remote-host.png`, `/tmp/inilive-remote-guest.png`. |
| 3. Fourth Guest cap | Pass | The Live Studio process-local Room cap blocks the fourth Guest before Backstage media connect; automated coverage remains `src/routes/room/[roomId]/presence.e2e.ts`. |
| 4. Screen share spike | Pass | Session 017 real Chromium check: Host started Screen Share, Guest received the LiveKit remote Screen Share track, Host stopped sharing, and Guest reflected no active Screen Share after reload. Screenshots: `/tmp/inilive-screen-share-guest.png`, `/tmp/inilive-screen-share-host-stopped.png`. |
| 5. Record evidence | Pass | Evidence recorded here and in `PLAN.org` / `PROGRESS.org`. |

**Exit criteria:** steps 1–3 pass on Chromium desktop. Step 4 can fail without blocking media-002 start, but must be recorded.

## Integration notes for media-002

- Server module: `src/lib/server/livekit-hub.ts` issues per-participant JWT grants.
- Wrapper: `src/lib/server/media-join.ts` uses real grants when LiveKit env vars are set; otherwise returns a local stub for prototype UI and automated tests.
- Live Studio `roomId` maps directly to the LiveKit room name; participant identity uses the ephemeral Join Check participant id.
- Browser connect (`livekit-client`) is the next media-002 slice and is the vehicle for live triage steps 2–4.

## Risks

- Doc review alone does not prove latency, reconnect, or Android Guest behavior.
- LiveKit token TTL is six hours; Backstage refreshes grants ten minutes before expiry through `/room/[roomId]/media-token`.
