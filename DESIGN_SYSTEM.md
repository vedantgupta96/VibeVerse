# DESIGN_SYSTEM.md

Visual language for VibeVerse. Goal: a cinematic, musical "deep space" instrument — not a SaaS dashboard. Dark-only in MVP (no light theme). Implement as Tailwind v4 `@theme` tokens; restyle shadcn/ui primitives to these tokens (never ship shadcn defaults).

## Aesthetic Direction

A night-sky observatory for your music: near-black violet space, luminous aurora gradients used *sparingly* as energy, frosted-glass surfaces floating above a particle field. Confident, atmospheric, a little theatrical. Reference feelings: planetarium UI, vinyl-era poster typography, music visualizers — not Spotify, not generic admin panels.

Three rules that keep it premium:
1. **Darkness is the canvas.** Large areas of near-black; glow and gradient are accents (< 10% of any screen), never backgrounds for body text.
2. **One hero moment per page** (galaxy canvas, generation animation, taste DNA orb). Everything else stays quiet.
3. **Motion implies sound.** Things pulse, drift, and ease like audio — nothing snaps.

## Color Tokens

```css
@theme {
  /* Space (backgrounds, low → high elevation) */
  --color-void: #07060B;        /* page background */
  --color-space-1: #0D0B14;     /* app shell panels */
  --color-space-2: #14111F;     /* cards */
  --color-space-3: #1C1730;     /* hover / raised */

  /* Text */
  --color-star: #F2EFFF;        /* primary text */
  --color-stardust: #A99FC4;    /* secondary text */
  --color-faint: #5E5678;       /* tertiary / placeholders */

  /* Aurora (brand accents) */
  --color-aurora-violet: #8B5CF6;
  --color-aurora-magenta: #E14ECF;
  --color-aurora-cyan: #22D3EE;
  --color-aurora-amber: #F5A623; /* rare warm pop: ratings, highlights */

  /* Semantic */
  --color-success: #34D399;
  --color-danger: #F87171;
  --color-border: rgba(169,159,196,0.14);
}
```

**Signature gradient** (logo, primary CTA, active states): `linear-gradient(135deg, #8B5CF6 0%, #E14ECF 55%, #22D3EE 100%)`. Use on: primary buttons, the generate action, active nav indicator, focus glows. Never on large panels.

**Mood colors** (memory tags, taste DNA): joyful `#F5A623`, nostalgic `#E14ECF`, melancholy `#6366F1`, energetic `#EF4444`, calm `#22D3EE`, romantic `#FB7185`, gritty `#A8A29E`, dreamy `#8B5CF6`.

## Typography

- **Display — "Clash Display"** (Fontshare, free): page titles, playlist names, archetype labels. Weights 500/600. Tight tracking (`-0.02em`), large sizes.
- **Body/UI — "Space Grotesk"** (Google Fonts): everything else. Weights 400/500/700. Its techy curves carry the musical-instrument feel without a third font.
- **Mono — "JetBrains Mono"**: timestamps, durations, debug.

Scale (rem): `display-xl 3.5 / display 2.25 / h2 1.5 / h3 1.25 / body 1 / small 0.875 / micro 0.75`. Line-height 1.1 for display, 1.6 for body. Never use Inter/system fonts.

## Surfaces & Glassmorphism

```css
.glass {
  background: rgba(20, 17, 31, 0.55);       /* space-2 @ 55% */
  backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid var(--color-border);
  border-radius: 1rem;                       /* radius-lg */
}
```
- Glass is for **floating** elements only: sidebar, player bar, modals, galaxy side panel. Static content cards use solid `space-2`.
- Elevation = blur + a faint top border highlight (`rgba(242,239,255,0.06)`), not heavy drop shadows. One soft ambient shadow token: `0 8px 32px rgba(0,0,0,0.35)`.
- Radii: `sm 8px / md 12px / lg 16px / full` (pills, avatars). Album art always `md`.

## Background Atmosphere

- App shell: `--color-void` with a fixed, very subtle starfield — a single canvas layer, ~120 drifting 1px particles at 4–8% opacity. Implemented once in `(app)/layout.tsx`; disabled when `prefers-reduced-motion`.
- One radial "nebula" glow per page anchored to the hero (e.g. `radial-gradient(600px at 20% 0%, rgba(139,92,246,0.15), transparent 70%)`).

## Motion (Framer Motion)

| Token | Value | Use |
|---|---|---|
| `fast` | 150 ms, `easeOut` | hovers, toggles |
| `base` | 280 ms, `[0.22, 1, 0.36, 1]` | cards, panels, page elements |
| `slow` | 600 ms, same curve | hero entrances, galaxy panel |

- Page transitions: fade + 8px rise on route content (`AnimatePresence`), 280 ms.
- Lists stagger children by 40 ms.
- **Audio-reactive touches**: preview-playing track cards get a subtle equalizer bar animation; the Generate button breathes (scale 1 → 1.02, 2 s loop) while the AI works.
- Respect `prefers-reduced-motion`: transitions become opacity-only, particles/breathing off.

## Component Inventory (build in this order)

| Component | Notes |
|---|---|
| `AppShell` | Left glass sidebar (icons + labels), main scroll area, bottom `PlayerBar` |
| `SearchBar` | Hero-sized on `/home`, compact in header elsewhere; ⌘K focus |
| `TrackCard` | Art, title, artist, duration (mono), `SaveButton`, `PreviewButton`; hover = raise to `space-3` + art glow |
| `SaveButton` | Heart → fills with signature gradient; spring pop on save |
| `PreviewButton` | Play/pause over album art; ring progress for the 30 s preview |
| `PlayerBar` | Bottom glass bar, only visible while previewing (Zustand store) |
| `MemoryCard` | Mood-colored left border, content, track chip, relative time |
| `MoodPicker` | Pill row using mood colors |
| `GenerationProgress` | Full-width panel: prompt echo, animated gradient shimmer + status copy ("reading your constellation…", "asking the DJ…", "finding the records…") |
| `PlaylistCard` | Title in Clash Display, vibe excerpt, stacked album art fan |
| `TasteDnaOrb` | Radial gradient orb whose color stops come from top mood colors; archetype label inside |
| `GalaxyCanvas` | Full-bleed canvas, pan/zoom, hover labels; genre nodes = soft glow rings, artists = circles w/ art, weight → radius |
| `EmptyState` | Per-page illustration-free: faint constellation line art + one-liner + CTA |

## Voice & Copy

Short, warm, a little cosmic. The AI DJ speaks first-person and confident ("Here's your frost-bitten focus set."). Buttons are verbs: "Generate", "Save", "Remember this". Empty states invite, never scold.

## Accessibility

- Text contrast ≥ 4.5:1 against its actual surface (stardust on void passes; never put faint text on gradients).
- All interactive elements: visible focus ring (`2px aurora-cyan @ 60%`), keyboard reachable.
- Previews never autoplay; one preview at a time.
- Gradient is never the only signal — pair with icon/label changes.
