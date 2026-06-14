# 0001 — The Big Picture

## Date
2026-06-15

## Context
First lesson. User is a web developer preparing to build Live Studio starting from Milestone 1. New to WebRTC, media composition, and live streaming.

## What was learned
- The five major components of the system: SFU, Canvas Composer, WHIP Client, Broadcast Bridge, and YouTube destination
- The end-to-end data flow: camera/mic → SFU → canvas composition → captureStream() → WHIP → GStreamer bridge → RTMP → YouTube
- Why milestones are ordered to retire risk first: M1 proves media composition, M2 proves the broadcast pipeline, M3 adds product infrastructure
- The distinction between SFU (routes individual streams) and MCU (mixes them server-side) and why SFU is the right choice
- Browser-side composition is the key architectural bet and the highest risk area

## Key insight
The milestone order is a risk retirement strategy, not a feature roadmap. M1 and M2 are spikes — the "normal" product development only starts at M3.

## What should come next
- WebRTC fundamentals: how connections are established, signaling, ICE candidates, STUN/TURN
- Canvas composition hands-on: drawImage() + captureStream() pattern
- SvelteKit project structure for the Room prototype
