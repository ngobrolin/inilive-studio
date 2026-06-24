# iniLive Studio

This context describes a browser-based live production studio where a host brings guests into a room and controls what is broadcast to an audience.

## Language

**Host**:
The person who owns a **Room**, joins with their own camera and microphone, invites **Guests**, controls what goes live, removes Guests, controls Guest muting and camera-off state, and starts or stops the broadcast.
_Avoid_: Author, creator, room owner

**Account**:
A sign-in identity required for a **Host** to create and return to Rooms. Guests do not need Accounts in v1.
_Avoid_: User profile, member, workspace

**Room**:
A reusable private live space created by one **Host** where the Host and up to three invited **Guests** can see and hear each other. While **Broadcasting**, everyone currently in the Room is visible to the **Audience**.
_Avoid_: Studio, meeting, session

**Room Title**:
A Host-facing name for a reusable **Room**. The Room Title helps the Host manage Rooms and is not part of the **Composed Room Feed** in v1.
_Avoid_: Show title, event name, stream title

**Room Full**:
The state shown to an invited person who tries to enter a **Room** that already has the Host and three Guests present. V1 does not include a waiting queue.
_Avoid_: Waiting room, queue, overflow

**Broadcast**:
One live run of a reusable **Room** sent to one **Broadcast Destination**. A Room can have many Broadcasts, and each Broadcast uses its own ephemeral stream credentials; v1 keeps Broadcast records for operations and debugging.
_Avoid_: Stream, event, session

**Broadcast Countdown**:
A short countdown shown to the **Host** and **Guests** immediately before a **Broadcast** starts.
_Avoid_: Timer, pre-roll, slate

**Broadcast State**:
The Room-visible state of the **Broadcast**, such as Backstage, Countdown, Broadcasting, Ended, or Failed.
_Avoid_: Room state, live status, stream state

**Broadcast Health**:
The Host-visible operational condition of an active or recently attempted **Broadcast**, such as connecting, broadcasting, degraded, failed, or ended. Guests see **Broadcast State**, not detailed Broadcast Health.
_Avoid_: Status, diagnostics, stream state

**Guest**:
An invited contributor in a **Room** who can share their own camera and microphone and communicate with the Host and other Guests. Guests can join from desktop or mobile browsers. Guests who join while the Room is **Broadcasting** appear to the **Audience** after they enter the Room; Guests do not control invitations, broadcast state, or other participants. A Guest can be removed, force-muted, or forced camera-off by the Host, but must confirm before being unmuted or turning camera back on.
_Avoid_: Participant, speaker, attendee

**Guest Invite**:
A hard-to-guess link created by the **Host** that grants a Guest entry into a **Room**. A Host can revoke or regenerate the Guest Invite.
_Avoid_: Meeting link, access code, participant URL

**Display Name**:
The name a person types before entering a **Room**. Display Names appear inside the Room and in the **Composed Room Feed**.
_Avoid_: Username, profile name, handle

**Join Check**:
The pre-entry step where a person types their **Display Name**, grants camera and microphone permission, chooses devices, sets camera and microphone state, and previews themselves before entering a **Room**.
_Avoid_: Lobby, setup screen, waiting room

**Supported Browser**:
A Chromium-based browser used by the **Host** or **Guest** to enter a **Room** in v1.
_Avoid_: Safari, Firefox, unsupported browser

**Audience**:
People who watch the broadcast outside the **Room** on YouTube in v1. The Audience is not part of the Room and does not join as Guests.
_Avoid_: Viewer, attendee, participant

**Backstage**:
The state of a **Room** where the Host and Guests can see and hear each other, but the Audience cannot watch. A Room returns to Backstage when a **Broadcast** ends.
_Avoid_: Preview, waiting room, pre-live

**Broadcasting**:
The state of a **Room** with an active **Broadcast**, where everyone currently in the Room is visible to the **Audience** through a **Broadcast Destination**.
_Avoid_: Live, streaming, published

**Composed Room Feed**:
A single audio/video feed representing everyone currently in the **Room** arranged as one final broadcast output. In v1, the feed targets 720p at 30fps, includes participant name labels, and includes name-labeled placeholders for camera-off participants.
_Avoid_: Separate participant feeds, individual sources, raw tracks

**Broadcast Preview**:
The Room-visible preview of the **Composed Room Feed**. While **Backstage**, it shows what would go live; while **Broadcasting**, it shows what is being sent to the **Broadcast Destination**.
_Avoid_: Program monitor, output preview, canvas preview

**Screen Share**:
A shared display, window, or browser tab contributed by the **Host** into the **Room**. A Room can have one active Screen Share at a time; while active, it is the primary visual in the **Composed Room Feed** with participant cameras shown as smaller tiles.
_Avoid_: Presentation, slides, desktop source

**Room Chat**:
A private text conversation between the **Host** and **Guests** inside a **Room**. Room Chat is not visible to the **Audience** and is not persisted in v1.
_Avoid_: Audience chat, comments, messages

**Broadcast Bridge**:
The service that carries the **Composed Room Feed** from the Room to a broadcast destination such as YouTube.
_Avoid_: OBS, stream client, relay

**Broadcast Destination**:
An external platform that receives the **Composed Room Feed** from the **Broadcast Bridge** so the **Audience** can watch it. V1 supports YouTube while keeping the concept compatible with RTMP destinations.
_Avoid_: Channel, output, stream target

## Flagged Ambiguities

**Stage**:
Do not use this term in v1. The Audience sees everyone currently in the **Room** while **Broadcasting**, rather than a Host-selected subset of participants.

**Producer-only Host**:
Do not use this concept in v1. A **Host** is also a visible participant in the **Room**.

**Guest Screen Share**:
Do not use this concept in v1. Only the **Host** can start a **Screen Share**.

**Audience Chat**:
Do not use this concept in v1. **Room Chat** is only for the **Host** and **Guests**.

**Workspace**:
Do not use this concept in v1. Each **Room** belongs to exactly one **Host** Account.

**Team**:
Do not use this concept in v1. Collaboration between multiple Host Accounts is outside the v1 scope.

**Host Disconnect Continuity**:
Do not use this concept in v1. If the **Host** leaves or disconnects during **Broadcasting**, the product waits through a short grace period and then ends the **Broadcast** rather than guaranteeing continued delivery of the real **Composed Room Feed**. If the Host disconnects while **Backstage**, Guests can remain in the Room for a short time waiting for the Host to return.

**Brand Kit**:
Do not use this concept in v1. Logos, banners, custom backgrounds, themes, and lower-third management are outside the v1 scope.

**File Uploads**:
Do not use this concept in v1. The product does not accept uploaded logos, backgrounds, or media assets.

**Billing**:
Do not use this concept in v1. Product limits constrain usage until billing and subscriptions are introduced later.

**Admin UI**:
Do not use this concept in v1. Early operations use structured logs and direct database inspection.

**Scheduled Broadcast**:
Do not use this concept in v1. A **Host** manually starts a **Broadcast** from a reusable **Room**.

**Mobile Host Production**:
Do not use this concept in v1. Host production is desktop-first.

**Multistreaming**:
Do not use this concept in v1. One **Broadcast** sends to one **Broadcast Destination**.

**Watch Page**:
Do not use this concept in v1. The **Audience** watches on YouTube, not on a public page in this product.

**Moderation**:
Do not use this concept in v1. The **Host** can remove Guests, but v1 does not include separate moderation tools for Display Names or **Room Chat**.

**Room Lock**:
Do not use this concept in v1. Guest entry is controlled through the **Guest Invite** and Guest removal.

**Guest Ban**:
Do not use this concept in v1. The **Host** can remove Guests and revoke or regenerate the **Guest Invite**, but v1 does not separately prevent a removed Guest from attempting to rejoin.

**Broadcast Title**:
Do not use this concept in v1. Public broadcast metadata such as the stream title is managed in YouTube, while this product uses **Room Title** only for Host organization.

**Broadcast History**:
Do not use this concept as a polished Host-facing UI in v1. **Broadcast** records exist for operations and debugging.

## Example Dialogue

Dev: "Can the Host invite Guests before going live?"

Domain expert: "Yes. The Host prepares the Room first, then decides when the Room is ready to broadcast."
