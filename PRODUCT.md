# Product

## Register

product

## Users

iniLive Studio is for a signed-in Host who owns a reusable Room and invited Guests who join that Room through a Guest Invite. The Host is usually preparing and running a live production from a Chromium-based desktop browser, while Guests may join from desktop or mobile browsers. Their shared job is to enter Backstage, confirm camera and microphone readiness, collaborate privately, and send one Composed Room Feed to a YouTube Audience when the Host starts a Broadcast.

## Product Purpose

iniLive Studio exists to make a browser-based live production Room operationally clear without requiring OBS, stream-client setup, or engineering-console workflows. Success means a Host can create a Room, invite up to three Guests, verify everyone in Join Check and Backstage, understand Broadcast State and Broadcast Health, and confidently start or stop a YouTube Broadcast from the product path.

## Brand Personality

Calm, operational, trustworthy. The interface should feel steady under production pressure, direct about what is happening, and explicit about recovery when media, permissions, OAuth, or Broadcast Bridge steps fail.

## Anti-references

Do not make iniLive Studio feel like a StreamYard clone. Avoid glossy creator-platform marketing UI, generic studio metaphors, decorative broadcast theatrics, and OBS-like technical control-room density. The product should preserve the repo vocabulary: Host, Guest, Room, Guest Invite, Join Check, Backstage, Broadcast, Broadcast State, Broadcast Health, Broadcast Preview, Composed Room Feed, Screen Share, and Broadcast Bridge.

## Design Principles

1. Keep production state legible. Backstage, Broadcast Countdown, Broadcasting, Ended, Failed, and Broadcast Health should be visually and verbally distinct at a glance.
2. Favor operational confidence over showmanship. Controls should feel predictable, grounded, and hard to misread during a live workflow.
3. Make readiness visible before commitment. Join Check, Guest Invite, media connection, Broadcast Preview, YouTube linking, and Broadcast Bridge status should help the Host know whether the Room is ready.
4. Preserve role clarity. Host-only controls, Guest-visible state, and Audience-facing implications must remain clearly separated.
5. Explain recovery in place. Permission, device, OAuth, quota, and bridge failures should tell the Host or Guest what changed and what to do next without exposing secrets.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Interfaces should support keyboard operation, readable contrast, clear focus states, reduced-motion preferences, descriptive form labels, and recovery copy that does not depend on color alone.
