# Composed Room Feed OBS capture (compose-002)

Supplementary validation that the Milestone 1 Composed Room Feed is capturable by external tools. OBS is a testing aid only; the product path is browser `captureStream()` → WHIP in Milestone 2.

## Automated coverage (hermetic)

Playwright verifies the same canvas path OBS would capture:

| Check | Coverage |
| --- | --- |
| 720p canvas dimensions | `composition-preview.e2e.ts` |
| `captureStream(30)` readiness | `composition-preview.e2e.ts` |
| ≥28fps draw loop | `composition-preview.e2e.ts` |
| Playable 1280×720 video track from `captureStream` | `composition-preview.e2e.ts` |
| Screen Share primary layout | `composition-preview.e2e.ts` |

## Live OBS triage (supplementary)

Run when marking compose-002 passing. Requires desktop Chromium and OBS.app.

| Step | Status | What to verify |
| --- | --- | --- |
| 1. Preview server | Pass | `npm run build && npm run preview -- --host 127.0.0.1` |
| 2. Backstage canvas | Pass | Host enters Join Check → Backstage; Composed Room Feed canvas shows participant grid at 1280×720 with `Composed feed stream ready` and ≥28fps |
| 3. Canvas screenshot | Pass | `/tmp/inilive-compose-002-canvas.png` captured the composed output with Backstage chrome and Host tile |
| 4. OBS Window Capture API | Pass | `scripts/verify/compose-002-obs-capture.mjs` connected over WebSocket, created `window_capture` input, matched the Playwright Chromium window titled `Backstage Room - Live Studio`, and called `GetSourceScreenshot` successfully |
| 5. OBS visual capture | Constrained | OBS returned a blank 3688-byte PNG in this environment without macOS Screen Recording permission for OBS. Grant **System Settings → Privacy & Security → Screen Recording → OBS** and re-run the script for a full OBS preview screenshot |
| 6. Record evidence | Pass | Evidence recorded here and in `PLAN.org` / `PROGRESS.org` |

### Optional scripted check

When OBS WebSocket is enabled locally:

```bash
export OBS_WEBSOCKET_PASSWORD='your-local-password'
node scripts/verify/compose-002-obs-capture.mjs
```

The script builds preview, opens Backstage in Chromium, captures canvas evidence, and drives OBS Window Capture via WebSocket when OBS is running.

## Constraints

- OBS Browser Source is **not** the M1 validation path; Window Capture of the browser canvas matches how engineers sanity-check composed output before WHIP.
- Automated e2e stays in stub LiveKit mode; OBS validation is independent of SFU credentials.
- macOS screen-recording permission may be required for OBS Window Capture.

## Integration notes for Milestone 2

- WHIP ingest will receive the same `canvas.captureStream(30)` MediaStream validated here.
- OBS remains out of the v1 product flow per ADR 0002.
