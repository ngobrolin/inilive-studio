---
name: iniLive Studio
description: Browser-based production Room UI for calm, operational YouTube broadcasts.
colors:
  ink-neutral: "#0a0a0a"
  ink-muted: "#525252"
  studio-surface: "#ffffff"
  studio-surface-muted: "#f5f5f5"
  studio-border: "#d4d4d4"
  studio-border-soft: "#e5e5e5"
  signal-cyan: "#0e7490"
  signal-cyan-strong: "#083344"
  signal-cyan-soft: "#ecfeff"
  caution-amber: "#fef3c7"
  caution-amber-strong: "#451a03"
  failure-rose: "#fff1f2"
  failure-rose-strong: "#4c0519"
  youtube-red: "#dc2626"
  success-green: "#f0fdf4"
  success-green-strong: "#166534"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0"
  eyebrow:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.14em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"
  "3xl": "32px"
  "4xl": "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink-neutral}"
    textColor: "{colors.studio-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-primary-hover:
    backgroundColor: "#262626"
    textColor: "{colors.studio-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-secondary:
    backgroundColor: "{colors.studio-surface}"
    textColor: "{colors.ink-neutral}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-danger:
    backgroundColor: "#be123c"
    textColor: "{colors.studio-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  input-default:
    backgroundColor: "{colors.studio-surface}"
    textColor: "{colors.ink-neutral}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  panel-default:
    backgroundColor: "{colors.studio-surface}"
    textColor: "{colors.ink-neutral}"
    rounded: "{rounded.md}"
    padding: "20px"
  status-cyan:
    backgroundColor: "{colors.signal-cyan-soft}"
    textColor: "{colors.signal-cyan-strong}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: iniLive Studio

## 1. Overview

**Creative North Star: "The Backstage Console"**

iniLive Studio is a quiet product interface for live production pressure. It should feel like a clear backstage console: structured, readable, and explicit about what is ready, what is waiting, and what needs intervention before a Broadcast reaches YouTube.

The visual system is restrained by default. White and neutral surfaces carry most screens; cyan is reserved for operational readiness and focused interaction; amber, rose, green, and YouTube red appear only when state or recovery demands them. This follows the PRODUCT.md personality: calm, operational, trustworthy.

This system explicitly rejects a StreamYard clone. It must not become glossy creator-platform marketing UI, generic studio theater, or an OBS-like engineering console. The Room vocabulary and workflow clarity are the brand.

**Key Characteristics:**

- Restrained product surfaces with dense but readable information.
- System sans typography with fixed rem sizes, no display theatrics.
- Thin borders and compact radii, with small shadows only on grouped panels.
- State colors used as operational signals, not decoration.
- Explicit role separation for Host controls, Guest state, Broadcast State, and Broadcast Health.

## 2. Colors

The palette is a restrained neutral console with a single operational cyan accent and semantic state colors for Broadcast work.

### Primary

- **Ink Neutral**: The primary action and text color. Use it for primary Host actions, high-emphasis headings, and dark media canvases.
- **Signal Cyan**: The operational accent. Use it for focus rings, media readiness, Screen Share, Broadcast Preview badges, microphone levels, and active system affordances.

### Secondary

- **YouTube Red**: Use only for YouTube channel linking and YouTube-specific actions. It should not become the general danger color.

### Tertiary

- **Caution Amber**: Use for Broadcast Countdown, Host-muted state, Room Full warning, and recoverable caution states.
- **Failure Rose**: Use for Broadcast failed, removal, destructive actions, and unrecoverable error states.
- **Success Green**: Use for completed linking, successful unlinking, and confirmation messages.

### Neutral

- **Studio Surface**: The default page and panel background.
- **Studio Surface Muted**: Nested data blocks, chat message bubbles, input read-only backgrounds, and inactive chips.
- **Studio Border**: Structural panel, input, video-frame, and divider borders.
- **Studio Border Soft**: Internal dividers where the hierarchy is already clear.
- **Ink Muted**: Secondary explanations and operational helper copy.

### Named Rules

**The Signal Rarity Rule.** Cyan is for readiness, focus, and media operations. Do not use it as a decorative brand wash.

**The State Owns the Color Rule.** Amber, rose, green, and YouTube red appear only when the state itself needs that color. If the element is not warning, failing, succeeding, or linking YouTube, keep it neutral.

## 3. Typography

**Display Font:** system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
**Body Font:** system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
**Label/Mono Font:** system-ui for labels; system monospace only for IDs, tokens, URLs, and ingest values.

**Character:** The type system is utilitarian and steady. It uses weight and spacing to distinguish controls, labels, and state, not decorative font changes.

### Hierarchy

- **Display** (600, 3rem, 1 line-height): Rare, for empty or terminal states such as Room Full.
- **Headline** (600, 2.25rem, 1.1 line-height): Primary page headings in Join Check and Backstage.
- **Title** (600, 1.5rem, 1.3 line-height): Panel titles, Broadcast State, Broadcast Health, participant names, and Preview headings.
- **Body** (400, 0.875rem, 1.5 line-height): Operational explanations, recovery copy, and dense dashboard text. Keep prose to 65-75ch where the layout allows.
- **Label** (600, 0.875rem, 1.25 line-height): Buttons, form labels, status labels, and control labels.
- **Eyebrow** (600, 0.75rem, 0.14em letter-spacing, uppercase): Local state labels such as Backstage, Guest Invite, Broadcast controls, and Collaboration view. Use sparingly inside panels, not above every section of a marketing page.

### Named Rules

**The One Family Rule.** Product UI uses one system sans family. Do not introduce display fonts, decorative type pairings, or fluid hero scales.

**The Labels Are Controls Rule.** Label text must stay compact, direct, and semantically useful. Avoid personality copy in buttons and field labels.

## 4. Elevation

iniLive Studio is flat-by-default. Depth comes from structure: borders, tonal backgrounds, spacing, and media-frame contrast. `shadow-sm` is allowed only on grouped operational panels and cards, where it separates dense state blocks from the page without feeling glossy.

### Shadow Vocabulary

- **Panel Low** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Use on white or state-tinted panels that group controls or status. Never combine this with wide soft decorative shadows.

### Named Rules

**The Border First Rule.** Use a 1px structural border before a shadow. If a panel needs more hierarchy, check spacing and heading structure before increasing elevation.

**The No Ghost Card Rule.** Do not pair a 1px border with soft shadows larger than 8px blur. This product should not look like a generic SaaS card grid.

## 5. Components

### Buttons

Buttons are compact, predictable, and stateful. Shape is gently rounded (6px for product surfaces, 8px on the dashboard legacy surface). Primary buttons use Ink Neutral or Signal Cyan Strong with white text; destructive actions use rose; YouTube channel linking uses YouTube Red.

- **Shape:** Gently curved rectangle (6px radius).
- **Primary:** Ink Neutral background, white text, 12px 16px or 16px 20px padding depending on workflow weight.
- **Hover / Focus:** Hover darkens neutral primaries to neutral-800. Focus uses a 2px Signal Cyan ring. Disabled states lower contrast with neutral-400 and `cursor-not-allowed`.
- **Secondary / Ghost:** White background, Studio Border, Ink Neutral text. Hover may darken the border to Ink Neutral.

### Chips

Chips are factual status tags, not decorative pills. Use full-pill radius with a light tonal background and strong readable text.

- **Style:** Neutral chips for regular state, amber chips for Host-muted or waiting state, cyan chips for media readiness.
- **State:** Chips should name actual state, such as `Mic muted`, `Host-muted`, or `Broadcasting`.

### Cards / Containers

Cards are operational panels. They group Broadcast controls, Broadcast Preview, Room media, Capacity, Room Chat, and participant cards.

- **Corner Style:** Product panels use 6px radius; dashboard sections currently use 12px radius.
- **Background:** White for normal panels, neutral-950 for media canvases, and semantic tints for status panels.
- **Shadow Strategy:** Use Panel Low only for grouped operational panels.
- **Border:** 1px Studio Border is the default. Internal dividers use Studio Border Soft.
- **Internal Padding:** 20px for major panels, 16px for compact dashboard cards, 12px for nested stat blocks.

### Inputs / Fields

Inputs are plain, bordered controls with direct labels. They should feel like operational fields, not marketing forms.

- **Style:** White background, Studio Border, 6px radius, 8-12px vertical padding.
- **Focus:** Remove default outline and add a 2px Signal Cyan focus ring.
- **Error / Disabled:** Error copy uses rose text near the field. Disabled fields use Studio Surface Muted and keep text readable.

### Navigation

Navigation is minimal. The top app navigation uses a white bar, bottom border, and a single dashboard link aligned to the right. Active segmented controls use an Ink Neutral fill and white text inside a bordered white container.

### Status Panels

Status panels are the signature component family. Broadcast State, Broadcast Health, Screen Share, Guest Invite, Countdown, and recovery messages use the same structure: an eyebrow label, a concise title, and one short recovery or state paragraph.

Use state panels to reduce ambiguity, not to decorate. A state panel should answer: what is happening, who can act, and what changes next.

## 6. Do's and Don'ts

### Do:

- **Do** keep the default surface neutral and let state panels carry urgency.
- **Do** reserve Signal Cyan for readiness, focus, media, and Screen Share operations.
- **Do** use the repo vocabulary exactly: Host, Guest, Room, Guest Invite, Join Check, Backstage, Broadcast, Broadcast State, Broadcast Health, Broadcast Preview, Composed Room Feed, Screen Share, Broadcast Bridge.
- **Do** make Host-only controls visually distinct from Guest-visible state.
- **Do** keep body copy concise and actionable, especially for OAuth, device, permission, quota, and Broadcast Bridge recovery.
- **Do** meet WCAG 2.2 AA contrast and include visible focus states for every interactive control.

### Don't:

- **Don't** make iniLive Studio feel like a StreamYard clone.
- **Don't** use glossy creator-platform marketing UI, generic studio metaphors, decorative broadcast theatrics, or OBS-like technical control-room density.
- **Don't** use cyan, amber, rose, green, or YouTube red as decoration. Each color must map to a real state or action.
- **Don't** introduce gradient text, glassmorphism, oversized hero metrics, decorative side-stripe borders, or identical card grids.
- **Don't** add display fonts, fluid hero typography, or invented form controls to product surfaces.
- **Don't** hide recovery information behind modals when inline state copy can explain what happened.
