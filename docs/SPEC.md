# Live Studio V1 Plan

## Product Shape

Live Studio is a browser-based production room for streaming a small group conversation to YouTube. A signed-in Host creates a reusable Room, invites up to three Guests, and controls when the Room is broadcast. Guests join by invite link without accounts. The Audience watches on YouTube, not inside the product.

V1 is intentionally closer to a simple StreamYard-style hosted studio than to a source-routing tool like VDO.Ninja. The app produces one Composed Room Feed and sends that feed to a Broadcast Bridge. OBS is only a testing aid for the first milestone, not part of the product flow.

**V1 positioning:** Target technical early-adopter streamers running simple multi-guest shows (podcasts, panels, small live conversations) who want a lightweight browser studio without installing OBS. V1 deliberately trades StreamYard-style polish (OAuth, brand kits, staging) for a smaller, self-hostable stack and faster validation of the core Room-to-YouTube path. Pasted YouTube credentials and no guest staging are accepted audience-narrowing constraints for v1, not oversights.

## Locked V1 Scope

**Account and role model**

- One Host Account owns each Room.
- Guests do not need accounts.
- One reusable Room has one Host and up to three Guests.

**Broadcast and destination**

- One Broadcast sends one Composed Room Feed to one Broadcast Destination.
- YouTube is the supported v1 destination.
- Audience watches on YouTube.

**Credentials and recording**

- Host pastes YouTube RTMP server URL and stream key for each Broadcast.
- Stream credentials are ephemeral and are not stored.
- YouTube archive is the only recording. **Assumption:** YouTube preserves the archive; platform-side archive loss (DMCA, account action) is outside product scope. Host UI includes a one-line note that recording lives on YouTube.

**Device and browser support**

- Host production is desktop-first.
- Guests may join from desktop or mobile browsers.
- Supported Host browser is Chromium-based desktop (Chrome or Edge).
- Supported Guest browsers for v1: Chromium desktop, Chrome on Android. iOS Safari is out of scope for v1.

**Composition**

- Composed Room Feed targets 720p at 30fps.
- Display names are limited to 50 characters and plain text (no HTML).

## Room Experience

**Backstage** is the default Room state when no Broadcast is active — participants can see and hear each other but nothing is live to YouTube.

Before entering, every person goes through Join Check:

- Type Display Name.
- Grant camera and microphone permissions.
- Choose camera and microphone devices.
- Choose initial camera and microphone state.
- Preview themselves before entering.

Inside the Room:

- Host and Guests can see and hear each other.
- Everyone in the Room appears in the Composed Room Feed while Broadcasting.
- New Guests who enter during Broadcasting appear after entering the Room.
- Camera-off participants appear as name-labeled placeholders.
- Participant name labels are included in the Composed Room Feed.
- Broadcast Preview is visible to everyone in the Room during Broadcasting. Host may hide their own Preview panel; Guests always see it while Broadcasting.
- Broadcast State is visible to everyone in the Room.
- Broadcast Health details are visible to the Host only.
- Room Chat is private to Host and Guests and is not persisted in v1.

## Interaction Design

**Join Check:** Unsupported browsers (including iOS Safari) see a compatibility message before device prompts. Permission denied shows inline recovery steps (reload, check browser settings). No devices found shows a retry action.

**Empty Room:** Host sees the Guest Invite link prominently with empty participant slots. Guests see a waiting message until the Host joins (no timeout).

**Host disconnect grace:** Separate from Empty Room — applies only after the Host was present and then disconnected. Guests see a live countdown (30s while Broadcasting, 60s while Backstage).

**Room layout:** Participant grid is primary. Broadcast Preview appears as a sidebar panel (desktop) or a compact always-visible strip (mobile Guest). Host can toggle their own Preview panel; Guests always see Broadcast Preview during Broadcasting.

**Camera-off placeholders:** Name on a neutral tile in both studio view and Composed Room Feed. Same label text in both.

**Host moderation:**

- Force-mute / force-camera-off: Guest sees a banner ("Host muted your mic" / "Host turned off your camera"). Guest may self-unmute only after Host sends "Request unmute" and Guest accepts.
- Request unmute: Host clicks request → Guest sees accept/dismiss prompt → Host sees "Waiting for Guest" then "Guest unmuted" or "Guest declined".
- Remove Guest: Guest is disconnected to a "You were removed from the Room" screen. Removal does not revoke the invite token — Host must separately revoke or regenerate the Guest Invite to block rejoin.

**Broadcast Health (Host only):** Indicator in the broadcast control bar — green (connected), yellow (degraded: frame drops or elevated latency), red (failed). Host can open a detail panel showing bridge-reported events. Guests see only Broadcast State, not health metrics.

**Failed broadcast:** All participants see "Broadcast failed". Host sees actionable error copy (check credentials, confirm YouTube channel is live-enabled, retry). Retry starts a new Broadcast from Backstage (no in-place resume).

**Countdown cancel (M3 only):** Guests briefly see "Broadcast cancelled" before returning to Backstage.

**Grace periods:** See Host disconnect grace above. Guests may leave the Room at any time.

**Late-join during Broadcasting:** Join Check shows a warning that entering will put them live on YouTube immediately after joining.

## Host Controls

The Host can:

- Create reusable Rooms.
- Set a Room Title for their own organization.
- Copy Guest Invite link.
- Revoke or regenerate Guest Invite (invalidates the current invite token).
- Start a Broadcast Countdown.
- Start and end Broadcasts.
- Paste ephemeral YouTube stream credentials.
- Remove Guests.
- Force-mute Guests.
- Request Guest unmute.
- Force a Guest camera off.
- Start one active Screen Share.

The Host cannot in v1:

- Act as producer-only while hidden.
- Select a subset of participants for a Stage.
- Let Guests screen share.
- Lock the Room.
- Ban Guests separately from removing them and revoking the Guest Invite.
- Moderate Display Names or Room Chat beyond removing Guests.

## Accessibility (baseline)

Keyboard-navigable Host controls, focus management for modals (credential entry, remove Guest), `aria-live` regions for Broadcast State changes, sufficient color contrast for status indicators. Full WCAG audit is out of scope for v1.

## Screen Share

V1 includes Host Screen Share. Only one Screen Share can be active in a Room at a time. When active, the Screen Share becomes the primary visual in the Composed Room Feed and participant cameras become smaller tiles.

Guest Screen Share is out of scope for v1.

## Broadcast Behavior

A reusable Room can have many Broadcasts. A Broadcast is one live run of the Room sent to one Broadcast Destination. **Backstage** is the default Room state when no Broadcast is active — it is not stored as a Broadcast record.

The full state machine below applies from **Milestone 3** (product shell with persistent records). **Milestone 2** uses a simplified flow: paste credentials → start → Broadcasting → End/Failed, with in-memory state only and no Countdown phase.

Broadcast states (stored on `broadcasts` records from M3, created when Countdown starts):

- Countdown: Host and Guests see a 5-second countdown before Broadcasting starts. Host can cancel Countdown before it completes (broadcast record is deleted; Room returns to Backstage).
- Broadcasting: everyone currently in the Room is visible to the Audience on YouTube.
- Ended: Broadcast has stopped and the Room returns to Backstage.
- Failed: Broadcast could not start or continue; Room returns to Backstage. Host may start a new Broadcast (no in-place resume).

If the Host ends a Broadcast, current participants remain connected in Backstage.

If the Host disconnects while Broadcasting, v1 waits through a 30-second grace period and then ends the Broadcast. During the grace period, Guests see a live countdown and "Host disconnected — waiting to reconnect"; the bridge holds the last composed frame via GStreamer `imagefreeze`. Keeping the Broadcast alive after Host disconnect is deferred because the v1 architecture composes the Room feed in the browser.

If the Host disconnects while Backstage, Guests can remain in the Room for up to 60 seconds waiting for the Host to return, then see a "Host unavailable" message.

## Explicit Non-Goals

- Stage or guest selection.
- Producer-only Host.
- Guest Screen Share.
- Audience Chat.
- Workspaces or Teams.
- Host disconnect continuity.
- Brand Kit: logos, banners, custom backgrounds, themes, lower-thirds.
- File uploads.
- Billing.
- Admin UI.
- Scheduled Broadcasts.
- Mobile Host production.
- Multistreaming.
- Public Watch Page.
- Moderation tools (audience chat moderation, display-name moderation, Room Chat moderation beyond removing Guests).
- Room Lock.
- Guest Ban.
- Broadcast Title.
- Polished Broadcast History UI (filters, pagination, export). Minimal broadcast status on the Room dashboard and DB inspection are in scope.
- Separate product recording.

## Architecture Decisions

Core stack:

- SvelteKit
- Node runtime
- Postgres
- Kysely + pg
- Plain SQL migrations
- Podman Compose on a persistent VPS

Media architecture:

- Production Room media uses WebRTC SFU.
- Managed SFU infrastructure is preferred for v1.
- Spike inLive first (3-day time-box; see Milestone 1 for success criteria).
- If inLive does not meet all four criteria within the time-box, switch to LiveKit Cloud. Peer-to-peer mesh is a 2-day temporary fallback only.

Composition and broadcast:

- Browser app composes the Room into one Composed Room Feed. M1 Broadcast Preview must use the same canvas `captureStream()` path that WHIP will ingest — OBS capture is supplementary validation only.
- Browser-to-bridge handoff uses WHIP from the Host browser. WHIP `POST` includes `Authorization: Bearer <per-broadcast-token>`. Invalid tokens return 401 before ingest starts.
- Broadcast Bridge is server-side, implemented with GStreamer (WHIP ingest → H.264/AAC → RTMP sink). VP8/VP9 browser output is transcoded to H.264 for YouTube RTMP.
- Broadcast Bridge runs as a separate Podman Compose service/process. WHIP signaling is proxied through Caddy (`/whip/*`); WebRTC media uses UDP ports exposed on the VPS public IP (not proxied by Caddy). Bridge control API is localhost-only.
- Bridge control uses short-lived per-Broadcast bearer tokens issued by SvelteKit; credentials are held in bridge memory for the broadcast duration and discarded on End or Failed (not persisted to disk or logs). Bridge reports health to SvelteKit via `POST /api/bridge/events` with HMAC-SHA256 signed payloads (shared secret per bridge process, verified by SvelteKit).
- OBS is only for prototype testing and capture validation.

Auth:

- Milestone 1 has no auth and no durable database.
- Product Shell uses custom email magic-link auth for Hosts.
- Sessions are server-side and stored in Postgres.
- Guests enter with Guest Invite and typed Display Name.

Operations:

- HTTPS via a reverse proxy (Caddy) terminating TLS on the VPS with automatic ACME certificates. WebRTC and `getUserMedia` require secure context outside localhost.
- Caddy routes `/whip/*` to the bridge WHIP endpoint; all other paths to SvelteKit. Bridge exposes UDP ports 10000–10100 on the VPS public IP for WebRTC media. Evaluate coturn in Podman Compose if symmetric NAT blocks direct connectivity.
- Broadcast Bridge (GStreamer) runs from a pinned container image with GStreamer ≥1.22 and WebRTC plugins; validate in the M2 spike before committing to the pipeline.
- Structured logs with secret scrubbing (stream keys, magic-link tokens, session tokens redacted).
- Broadcast Health: ephemeral in M2, persisted in Postgres from M3. Bridge reports via `POST /api/bridge/events`.
- Direct database inspection for early support.
- No full tracing or metrics stack in v1.

Email (Milestone 3):

- Transactional email via a managed provider (Resend or Postmark). Self-hosted SMTP is out of scope for v1.

Security (Milestone 3):

- Magic links: ≥128-bit token entropy, 15-minute expiry, single-use, invalidated on re-request. Login endpoint returns identical response regardless of email existence.
- Sessions: HttpOnly, Secure, SameSite=Lax cookies; ≥128-bit session tokens; 30-day absolute expiry with sliding activity window; invalidated on magic-link re-auth.
- Guest invites: ≥128-bit URL-safe tokens; rate-limit join attempts per IP.
- SFU join tokens: server-issued, scoped to room and role; revoked on Guest removal. Tokens persist across Broadcast end while participants remain in Backstage.

## Milestones

### Milestone 1: Local Room Prototype

Goal: prove the Room experience and composed output before product infrastructure.

Included:

- Authless Host link.
- Authless Guest Invite.
- In-memory or local ephemeral Room state.
- Join Check.
- Host plus up to three Guests.
- Camera and microphone communication.
- Host Screen Share.
- Host moderation controls (force-mute, force-camera-off, request-unmute, remove Guest).
- Minimal ephemeral Room Chat.
- Broadcast Preview showing browser-composed output.
- OBS-capturable output for testing.
- Manual media test script.

Preferred media path:

- Time-box the inLive spike to 3 working days. Success requires: multi-participant room API, screen-share support, per-participant access tokens, and node-compatible server SDK.
- If inLive does not meet all four within the time-box, switch to LiveKit Cloud without further forcing.
- Peer-to-peer mesh is only a temporary fallback (max 2 days) to unblock UI/composition while evaluating managed SFU.

Exit criteria:

- Host and three Guests can join from supported browsers.
- Participants can see and hear each other.
- Host can screen share.
- Room Chat works during the active Room.
- Composed output sustains ≥28fps on a reference machine (Apple M1 / 8GB RAM or equivalent) with four participants. This is the M1 minimum gate; the 30fps product target is validated end-to-end in Milestone 2.
- Browser produces a `MediaStream` via `captureStream()` from the composition canvas at ≥28fps — the same stream WHIP will ingest in Milestone 2.
- OBS can capture the composed output for supplementary testing.
- Manual test script documents known browser/device constraints, including Chrome on Android.

### Milestone 2: Broadcast Bridge Spike

Goal: prove the path from Composed Room Feed to YouTube.

Included:

- Take Composed Room Feed from prototype.
- Send it to a server-side Broadcast Bridge.
- Push to YouTube using pasted RTMP credentials.
- Do not store stream key.
- Show ephemeral Broadcast Health to Host (in-memory via bridge callback; not persisted).
- Keep accounts and reusable Room UI minimal or absent.

Exit criteria:

- Host can paste YouTube stream credentials.
- Broadcast Bridge starts and sends the feed to YouTube.
- YouTube receives 720p30 H.264 feed.
- Broadcast can be ended cleanly.
- Wrong credentials (bad URL, bad key, channel not live-enabled) produce a visible Host failure state within 30 seconds.
- Bridge authenticates ingest via per-Broadcast bearer token.
- Bridge logs debug common failures without exposing stream keys (redacted RTMP URLs).
- Bridge reports Failed/Ended state to SvelteKit within 10 seconds of RTMP disconnect.
- GStreamer ≥1.22 pipeline validated in pinned container image (WHIP ingest, H.264/AAC output).

### Milestone 3: Product Shell

Goal: turn the proven media path into a usable v1 product.

Included:

- Host Account with custom email magic-link auth.
- Reusable Rooms.
- Room Title.
- Room dashboard.
- Guest Invite revoke/regenerate.
- Product-backed Broadcast records.
- Ephemeral stream credential entry.
- Broadcast Countdown.
- Broadcast State for all Room participants.
- Broadcast Health for Host with durable events in Postgres and product UI.
- End Broadcast behavior.
- Host moderation controls wired to product-backed Room sessions.
- Postgres via Podman Compose.
- Kysely + pg database access.
- Plain SQL migrations.
- Transactional email provider for magic links.

Exit criteria:

- Host can sign in and return to Rooms.
- Host can create and manage reusable Rooms.
- Guests can join by Guest Invite without accounts.
- Host can broadcast a Room to YouTube with pasted credentials.
- Broadcast records and health events exist for debugging. Room dashboard shows last broadcast status only — no dedicated history page.
- Room Chat remains ephemeral.
- No v1 non-goals have slipped into the product surface.
- All Milestone 1 authless prototype routes are removed or protected by Host session middleware.

## Initial Data Model Sketch

This is a starting point, not a final schema.

- accounts: Host identity and email. Host may request account deletion; cascades to sessions, rooms, and broadcasts. Logs retained 30 days max.
- sessions: server-side Host sessions.
- magic_link_tokens: single-use login tokens with expiration.
- rooms: reusable Room records owned by one Host Account, with a Host-facing title.
- guest_invites: shareable Guest Invite link backed by a URL-safe invite token; tracks revoked/regenerated state.
- broadcasts: one live run of a Room, with state and timestamps.
- broadcast_health_events: operational events for Host visibility and support.

Do not store:

- YouTube stream keys.
- Room Chat messages.
- Audience data.
- YouTube archive copies.
- Uploaded assets.

## First Implementation Tasks

### Milestone 1

1. Create SvelteKit app skeleton with Node runtime.
2. Add a Room prototype route for Host and Guest entry.
3. Build Join Check with display name, permissions, device selection, mute/camera-off state, and local preview.
4. Implement ephemeral Room presence and Room Chat.
5. Spike inLive Room media integration (3-day time-box).
6. If inLive time-box fails, switch to LiveKit Cloud; use WebRTC mesh only as a 2-day UI unblock fallback.
7. Build participant grid and Broadcast Preview.
8. Build browser composition path for 720p30 Composed Room Feed with `captureStream()` suitable for WHIP.
9. Add Host Screen Share as primary visual with participant tiles.
10. Write manual media test script (desktop + Chrome on Android).

### Milestone 2

11. Implement Broadcast Bridge with GStreamer (WHIP ingest → H.264/AAC → YouTube RTMP). Target: 720p30, 4 Mbps, keyframe every 2s, AAC 44.1kHz stereo.
12. Add bridge control API with per-Broadcast bearer tokens and ephemeral credential handoff.
13. Add bridge health callbacks (`POST /api/bridge/events`) and Host-visible failure states.
14. Validate GStreamer ≥1.22 WHIP pipeline in pinned container; add coturn to Podman Compose if NAT blocks direct UDP.

### Milestone 3

15. Add Postgres, Kysely, migrations, and transactional email provider.
16. Implement custom email magic-link auth and session management.
17. Build reusable Rooms, Guest Invite management, and Room dashboard.
18. Wire product-backed Broadcast records and durable health events.
19. Remove or protect all Milestone 1 authless prototype routes.

## Key Risks

- Browser composition may be CPU-heavy with screen share plus four participants.
- Managed SFU provider APIs may not map cleanly to the Room model.
- Browser-to-bridge media handoff may be harder than Room media itself.
- YouTube RTMP failures need clear Host-visible errors.
- Host disconnect during Broadcasting is not continuous in v1.
- Mobile Guest support may expose device and permission edge cases.

## External References

- VDO.Ninja docs (WebRTC reference only, not architectural model): https://docs.vdo.ninja/
- inLive docs: https://inlive.app/docs/introduction/
- SvelteKit docs: https://kit.svelte.dev/docs/introduction
- Kysely docs: https://kysely.dev/
- node-postgres docs: https://node-postgres.com/
- PostgreSQL docs: https://www.postgresql.org/docs/
