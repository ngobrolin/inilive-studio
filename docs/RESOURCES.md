# Resources

Curated resources for learning Live Studio's technology stack. Organized by topic, prioritized by quality and relevance to the mission.

## WebRTC Fundamentals

| Resource                     | URL                                                         | Level                 | Notes                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| MDN Web Docs — WebRTC API    | https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API | Beginner              | Gold-standard reference. Start here.                                                                                         |
| WebRTC Samples               | https://webrtc.github.io/samples/                           | Beginner              | Official code samples for every part of the API. Hands-on companion to MDN.                                                  |
| webrtc.org — Getting Started | https://webrtc.org/getting-started/overview                 | Beginner              | Official home of WebRTC, maintained by Google. Architecture overviews.                                                       |
| WebRTC for the Curious       | https://webrtcforthecurious.com/                            | Intermediate          | Free book by WebRTC implementers. Deep protocol coverage (ICE, STUN, TURN, DTLS, SRTP, SDP). Best second resource after MDN. |
| WebRTCHacks                  | https://webrtchacks.com/                                    | Intermediate–Advanced | Community blog with deep-dives and real-world challenges.                                                                    |

**Recommended path:** MDN docs → WebRTC Samples → webrtc.org guides → WebRTC for the Curious.

## SFU vs Mesh vs MCU

| Resource                                      | URL                                                       | Level                 | Notes                                                             |
| --------------------------------------------- | --------------------------------------------------------- | --------------------- | ----------------------------------------------------------------- |
| BlogGeek.me — WebRTC Multiparty Architectures | https://bloggeek.me/webrtc-multiparty-video-alternatives/ | Beginner–Intermediate | The most cited explainer on Mesh vs MCU vs SFU. Covers simulcast. |
| BlogGeek.me — SFU Resources                   | https://bloggeek.me/webrtc-sfu/                           | Intermediate          | Aggregated SFU articles and comparisons.                          |

## Canvas Composition (Browser-Side)

| Resource                                      | URL                                                                              | Level                 | Notes                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| MDN — HTMLCanvasElement.captureStream()       | https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream | Beginner              | The API that converts canvas rendering into a MediaStream.                |
| MDN — Canvas API Guide                        | https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API                      | Beginner              | drawImage() for rendering video elements onto canvas.                     |
| video-stream-merger (npm)                     | https://github.com/t-mullen/video-stream-merger                                  | Beginner–Intermediate | Open-source reference implementation for canvas-based stream compositing. |
| Chrome Developers — Media Capture from Canvas | https://developer.chrome.com/blog/capture-stream/                                | Intermediate          | Practical examples for recording/streaming canvas content.                |

## WHIP Protocol

| Resource                  | URL                                    | Level                 | Notes                                                                |
| ------------------------- | -------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| http.dev — WHIP Explainer | https://http.dev/whip                  | Beginner–Intermediate | Best plain-language explainer. How the HTTP POST/SDP exchange works. |
| Dolby.io — What is WHIP?  | https://dolby.io/blog/what-is-whip/    | Beginner              | Clear overview with diagrams.                                        |
| RFC 9725 — WHIP           | https://www.rfc-editor.org/rfc/rfc9725 | Intermediate–Advanced | The authoritative IETF spec.                                         |

## inLive SDK

| Resource                | URL                                   | Level                 | Notes                                                   |
| ----------------------- | ------------------------------------- | --------------------- | ------------------------------------------------------- |
| inLive Developer Docs   | https://inlive.app/docs/introduction/ | Beginner              | Official getting-started. Covers APIs, SDK setup, auth. |
| inLive Developer Portal | https://docs.inlive.app/              | Beginner–Intermediate | Full API reference and tutorials.                       |

## GStreamer

| Resource                                       | URL                                                                                       | Level                 | Notes                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------- |
| GStreamer Official Tutorials                   | https://gstreamer.freedesktop.org/documentation/tutorials/index.html                      | Beginner              | Start with Basic Tutorial 1 & 2. Elements, pipelines, pads, bus. |
| GStreamer Application Dev Manual — Foundations | https://gstreamer.freedesktop.org/documentation/application-development/basics/index.html | Beginner–Intermediate | Conceptual deep-dive. Elements=devices, pads=ports, bins=racks.  |

## SvelteKit

| Resource       | URL                                      | Level    | Notes                                  |
| -------------- | ---------------------------------------- | -------- | -------------------------------------- |
| SvelteKit Docs | https://kit.svelte.dev/docs/introduction | Beginner | Official docs. Referenced in the plan. |

## Database (M3)

| Resource           | URL                              | Level     | Notes                                       |
| ------------------ | -------------------------------- | --------- | ------------------------------------------- |
| Kysely Docs        | https://kysely.dev/              | Beginner  | Type-safe SQL query builder for TypeScript. |
| node-postgres Docs | https://node-postgres.com/       | Beginner  | Low-level Postgres driver.                  |
| PostgreSQL Docs    | https://www.postgresql.org/docs/ | Reference | Official Postgres docs.                     |
