# iniLive Studio Brand Spec

Source: `DESIGN.md`, current Svelte/Tailwind product UI, and the 2026-07-04 design context in `PLAN.org`.

## Tokens

```css
:root {
  --bg: oklch(96.7% 0 0);
  --surface: oklch(100% 0 0);
  --fg: oklch(16% 0 0);
  --muted: oklch(43.9% 0 0);
  --border: oklch(87.2% 0 0);
  --accent: oklch(52% 0.105 223.128);

  --font-display: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-body: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}
```

## Extended State Tokens

```css
:root {
  --ink-muted: oklch(43.9% 0 0);
  --studio-surface-muted: oklch(96.7% 0 0);
  --studio-border-soft: oklch(92.2% 0 0);
  --signal-cyan-strong: oklch(30.2% 0.056 229.695);
  --signal-cyan-soft: oklch(98.4% 0.019 200.873);
  --caution-amber: oklch(96.2% 0.059 95.617);
  --caution-amber-strong: oklch(27.9% 0.077 45.635);
  --failure-rose: oklch(96.9% 0.015 12.422);
  --failure-rose-strong: oklch(27.1% 0.105 12.094);
  --youtube-red: oklch(57.7% 0.245 27.325);
  --success-green: oklch(98.2% 0.018 155.826);
  --success-green-strong: oklch(44.8% 0.119 151.328);
}
```

## Layout Posture

- Product vocabulary stays Host, Guest, Room, Backstage, Broadcast, Broadcast State, Broadcast Health, Guest Invite, and Broadcast Destination.
- The prototype should feel like a backstage console: structured, readable, explicit about readiness, waiting, and recovery.
- Use flat surfaces with 1px borders first; small shadows are allowed only for dense grouped operational panels.
- Use compact 4px to 8px radii for core controls and panels; avoid glossy rounded creator-platform styling.
- Cyan is scarce and operational: readiness, focus rings, media state, Screen Share, Broadcast Preview, and primary active affordances.
- Amber, rose, green, and YouTube red appear only for caution, failure, success, or YouTube-specific linking.
- Dark surfaces belong to media/video composition areas, not to every panel.
