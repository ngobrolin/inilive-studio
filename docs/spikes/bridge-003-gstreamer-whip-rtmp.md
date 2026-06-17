# GStreamer WHIP-to-RTMP bridge (bridge-003)

Milestone 2 spike proving the server-side Broadcast Bridge path from browser WHIP ingest to YouTube-compatible RTMP output.

## Architecture

| Piece | Role |
| --- | --- |
| `src/routes/whip/[roomId]/+server.ts` | SvelteKit bearer-token gate, then WHIP proxy |
| `src/lib/server/bridge-client.ts` | Control + WHIP client to the separate bridge process |
| `services/broadcast-bridge/` | Separate Node control server + GStreamer pipeline launcher |
| `services/broadcast-bridge/Dockerfile` | Pinned Ubuntu 24.04 image with GStreamer ≥1.22 and `gst-plugin-webrtc` |

## Output profile

- 1280×720 @ 30fps
- H.264 ~4 Mbps, keyframe every 2s
- AAC 44.1 kHz stereo
- RTMP sink built from ephemeral Host credentials

## Automated coverage (hermetic)

| Check | Coverage |
| --- | --- |
| Output profile constants | `src/lib/server/bridge-pipeline.spec.ts` |
| RTMP location + log redaction | `src/lib/server/bridge-pipeline.spec.ts` |
| Bridge control client | `src/lib/server/bridge-client.spec.ts` |
| SvelteKit WHIP auth + proxy | `src/routes/whip/[roomId]/server.spec.ts` |

Hermetic Playwright and `./init.sh` keep `BRIDGE_ENABLED` off so tests do not require a running bridge container.

## Live bridge triage

Run when marking bridge-003 passing.

| Step | Status | What to verify |
| --- | --- | --- |
| 1. Build pinned image | Passed | `node scripts/verify/bridge-003-gstreamer.mjs` builds `inilive-broadcast-bridge:bridge-003` from `services/broadcast-bridge`. The Dockerfile uses the published `gst-plugin-webrtc` crate tarball to avoid moving git workspace fetches. |
| 2. GStreamer version | Passed | The strict verifier confirmed container GStreamer 1.24, above the 1.22 minimum. |
| 3. Runtime elements | Passed | The strict verifier confirmed `whipserversrc`, `x264enc`, `avenc_aac`, `flvmux`, and `rtmpsink` with `gst-inspect-1.0` inside the image. |
| 4. Control API session | Passed | `POST /sessions` starts a room-scoped pipeline with redacted RTMP location in JSON, and `DELETE /sessions/:roomId` stops it. |
| 5. WHIP browser path | Passed | Host Broadcast start creates a WHIP offer from the 720p Composed Room Feed and POSTs SDP to `/whip/:roomId` with `Authorization: Bearer whip_...`. |
| 6. YouTube output | Deferred to bridge-005 | Real YouTube reception and wrong-credential behavior require live-enabled YouTube credentials and remain HITL. |

### Scripted check

```bash
node scripts/verify/bridge-003-gstreamer.mjs
```

The script builds the bridge image, checks GStreamer version inside the container, verifies the required WHIP-to-RTMP runtime elements, and exercises the control API session lifecycle. It exits non-zero if any bridge-003 AFK gate is missing.

## Constraints

- `whipserversrc` comes from `gst-plugin-webrtc` in `gst-plugins-rs`; the Dockerfile builds it from source.
- Ubuntu 24.04's packaged GStreamer 1.24 does not include `whipserversrc` in `gstreamer1.0-plugins-bad`, so the source-built Rust plugin remains required for this bridge path.
- Full browser WHIP → YouTube verification remains HITL in bridge-005.
- macOS dev hosts without Podman can still run the hermetic unit tests and the Node bridge service when GStreamer + plugins are installed locally.

## Integration notes

- SvelteKit starts/stops bridge sessions when the Host starts/ends a Broadcast with `BRIDGE_ENABLED=1`.
- The Host browser publishes the 720p Composed Room Feed to the SvelteKit WHIP endpoint when Broadcast state becomes Broadcasting.
- Stream keys are never logged; bridge stderr redacts RTMP sink locations.
