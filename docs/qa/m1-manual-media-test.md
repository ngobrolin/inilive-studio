# Milestone 1 manual media test script (qa-001)

Use this script to validate the Local Room Prototype on real browsers and devices. Automated checks in `./init.sh` cover state logic and hermetic UI paths; this script covers browser media behavior that automation cannot fully replace.

## Prerequisites

- Repository checkout at `~/code/inilive-studio`
- `./init.sh` passes on the test machine
- Desktop Chromium browser (Chrome, Edge, or Chromium)
- Optional: LiveKit credentials in `.env` for real two-participant media and Screen Share checks
- Optional: OBS.app with WebSocket enabled for supplementary composed-output capture
- Optional: Android phone with Chrome for Guest mobile coverage

## Expected evidence for Milestone 1

Record pass/fail notes and screenshots for:

- Host and Guest Join Check with camera/microphone permissions
- Backstage presence for Host plus up to three Guests
- Room Full on fourth Guest attempt
- Room Chat message from Host and Guest
- Host moderation actions and Guest banners
- Host Screen Share start/stop with Guest visibility
- Broadcast Preview and Composed Room Feed canvas at 1280×720 with ≥28fps
- Optional LiveKit remote tiles when credentials are configured
- Optional OBS Window Capture of the composed canvas

Suggested screenshot paths:

- `/tmp/inilive-qa-host-join.png`
- `/tmp/inilive-qa-backstage.png`
- `/tmp/inilive-qa-screen-share.png`
- `/tmp/inilive-qa-compose-canvas.png`

## 1. Host on desktop Chromium

1. Run `./init.sh`, then `npm run dev`.
2. Sign in at `/login`, create a Room from `/dashboard`, and open the Host Room link.
3. Open **Enter as Host** and complete Join Check at `/room/<roomId>/join`.
4. Enter Display Name `Host QA`, allow camera and microphone, and click **Enter Room**.
5. Verify Backstage loads at `/room/<roomId>/backstage`.
6. Verify **Participant grid**, **Broadcast Preview**, **Composed Room Feed** canvas, and **Local preview only** or **Connected · LiveKit** media status.
7. Verify the Composed Room Feed shows `Composed feed stream ready` and measured fps ≥28 after a few seconds.

**Pass if:** Host reaches Backstage with Join Check media state reflected in the UI and the composed canvas is drawing at the M1 fps gate.

## 2. Guest on desktop Chromium

1. Copy the Guest Invite link from the Host dashboard or Backstage for the same Room.
2. In a second desktop Chromium profile or window, open the Guest Invite link and continue to Join Check.
3. Enter Display Name `Guest QA`, allow camera and microphone, and click **Enter Room**.
4. Verify Guest Backstage shows both participants, Broadcast Preview, and no Host-only controls such as **Start Screen Share** or Guest moderation buttons.
5. If LiveKit credentials are configured, verify remote participant tiles appear for Host and Guest.
6. On each Backstage session, confirm **Room media** reaches `Connected · LiveKit` before checking remote tiles. If it stays on `Connecting · LiveKit` for more than ~15 seconds, read the message under it and retry after fixing the cause.

**Pass if:** Guest enters the same Room, sees Host presence, and does not receive Host-only controls.

**LiveKit troubleshooting when Guest stays on Connecting:**

- Use a **second browser profile or incognito window** for the Guest. Same-profile tabs can fight over one camera and leave the Guest stuck connecting.
- Confirm `.env` has `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`, then restart `npm run dev` or `npm run preview` so both Host and Guest hit the same app instance with credentials loaded.
- Host and Guest must use the **current Guest Invite link** from dashboard or Backstage. Legacy `/invite/demo` links are invalid for product Rooms.
- If the Guest shows `LiveKit connection failed`, allow camera and microphone for the site in browser settings and reload Backstage.
- If the message mentions camera setup timing out, close other apps using the camera (including the Host tab on single-camera machines) and reload the Guest Backstage page.

## 3. Guest on Chrome for Android

1. On an Android device on the same network, open the current Guest Invite link from the Host dashboard or Backstage.
2. Complete Join Check with camera and microphone permissions.
3. Verify Guest reaches Backstage and sees Host presence.

**Pass if:** Android Guest can join and see Room presence. Record any device-specific media limitations honestly.

**Known constraint:** Android camera/mic behavior varies by device; failures here do not block desktop M1 exit criteria but must be recorded.

## 4. Room Full

1. Open three separate Guest sessions for the same Guest Invite link with distinct Display Names.
2. Attempt a fourth Guest entry.
3. Verify the fourth Guest sees **Room Full** instead of Backstage.

**Pass if:** the prototype cap of one Host plus three Guests is enforced before media connect.

## 5. Room Chat

1. With Host and Guest in Backstage, send a message from each role.
2. Verify messages show sender Display Name and plain text.
3. Restart the dev server and verify Room Chat history is gone.

**Pass if:** Room Chat works during the active Room and is not persisted across restart.

## 6. Host moderation controls

1. With Host and Guest in Backstage, force-mute the Guest microphone.
2. Verify Guest banner copy for Host-muted microphone.
3. Request unmute and accept from the Guest session.
4. Remove the Guest and verify the removed-from-Room screen.

**Pass if:** each moderation action updates Guest-facing copy/state as specified in room-005.

## 7. Host Screen Share

1. On desktop Chromium with LiveKit credentials configured, start Host Screen Share.
2. Verify Guest sees active Screen Share state and, with real LiveKit enabled, a remote Screen Share tile.
3. Stop Screen Share and verify both sessions return to no active Screen Share.

**Pass if:** only the Host can start/stop Screen Share and Guest UI reflects active/inactive state.

**Known constraint:** Automated e2e uses stub LiveKit mode; real Screen Share requires credentialed desktop Chromium verification.

## 8. Broadcast Preview and composed canvas output

1. With Host plus at least one Guest in Backstage, verify Broadcast Preview shows Backstage/not-live copy and participant labels.
2. Verify the Composed Room Feed canvas is 1280×720, reports `Composed feed stream ready`, and sustains ≥28fps.
3. Start Host Screen Share and verify the canvas primary source switches to **Screen Share**.

**Pass if:** Broadcast Preview and Composed Room Feed match current Room participants and Screen Share state.

## 9. Supplementary OBS capture

1. Build and preview the app: `npm run build && npm run preview -- --host 127.0.0.1`.
2. Open Host Backstage in Chromium and scroll the Composed Room Feed canvas into view.
3. In OBS, add **Window Capture** for the Chromium window titled `Backstage Room - Live Studio`.
4. Verify OBS preview shows the composed canvas including `Backstage Broadcast Preview · Not live` chrome.

Optional scripted path:

```bash
export OBS_WEBSOCKET_PASSWORD='your-local-password'
node scripts/verify/compose-002-obs-capture.mjs
```

**Pass if:** OBS can capture the composed browser output, or the script records a documented macOS Screen Recording permission constraint.

## Known browser and device constraints

- v1 Host target browser: desktop Chromium.
- Guest desktop target: desktop Chromium.
- Guest mobile target: Chrome on Android; iOS Safari is out of scope for M1.
- LiveKit real media, Screen Share, and OBS Window Capture require local credentials and macOS privacy permissions.
- `./init.sh` Playwright runs with empty LiveKit env vars so automated tests stay hermetic in stub mode.
- Room presence, Room Chat, and moderation state are process-local and reset on server restart by design.

## Automated checks to run before manual sign-off

```bash
./init.sh
npm run check
npm run lint
npm run build
```

Record Vitest and Playwright counts from `./init.sh` in the test notes for the session.
