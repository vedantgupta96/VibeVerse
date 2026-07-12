# Beta Accessibility and Resilience Audit

## Scope and method

This Phase 11 audit covers `/login`, `/signup`, `/home`, `/rooms`, and a joined `/rooms/[id]` state in Chromium. Automated axe scans gate critical and serious violations at a desktop viewport. A 390 × 844 viewport additionally covers login, authenticated home, persistent navigation, and a joined room. The core browser flow checks protected-route recovery, signup, two-user room joining, roster convergence, reactions, the gentle rate-limit notice, leaving, and rejoining.

Automated checks are deliberately described as a partial accessibility gate, not WCAG certification or user evidence. They catch programmatic failures but cannot judge reading order quality, voice-control ergonomics, or whether announcements are useful in a real screen reader.

## Confirmed remediations

- Added a keyboard-visible “Skip to main content” link and one stable `main` landmark target on marketing, auth, and authenticated layouts.
- Labeled desktop and mobile primary navigation and exposed `aria-current="page"` on active destination links.
- Restored authenticated mobile wayfinding with a persistent bottom navigation: Home, Search, Library, Rooms, and a labeled More control for Journal, AI DJ, Taste DNA, and Galaxy. Targets are approximately 44px or larger, the panel has logical DOM order, selection closes it, and Escape closes it while returning focus.
- Added safe-area/content/player spacing so the mobile navigation does not block core content or preview controls.
- Raised the tertiary `faint` token from `#5E5678` to `#8A80A9`; the former was an obvious 2.96:1 failure on the void canvas, while the replacement remains visually tertiary and clears 4.5:1 on the app's raised space surfaces.
- Kept realtime rate-limit feedback in a polite live status region and room errors in alert regions.
- Preserved reduced-motion behavior and the existing no-autoplay policy.

## Automated coverage

- Playwright: `e2e/core-flow.spec.ts`
- axe + mobile navigation keyboard check: `e2e/accessibility.spec.ts`
- Run with `npm run test:e2e` after local PostgreSQL is migrated. The configured server intentionally leaves `REDIS_URL` empty to exercise the in-process realtime fallback.

## Remaining manual checks

These are required before describing the beta as broadly accessible:

- VoiceOver + Safari reading order, landmarks, form errors, room status, and dynamic roster updates.
- Keyboard-only completion of every core solo task, including galaxy controls and memory editing.
- Browser zoom at 200% and 400%, including 320px-equivalent reflow and long localized content.
- Reduced-motion inspection at the OS level, high-contrast/forced-colors inspection, and voice-control target naming.
- Real usability sessions with disabled users and people using their own assistive technology.
- Slow/intermittent network and SSE-blocked production tests through the deployed CDN path.

No accessibility score, compliance claim, or completed user-research result is asserted here.
