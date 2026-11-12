<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Animation scope

Motion is used sparingly and only where it means something. See `docs/design.md` for the full design direction.

Authenticated `(app)` screens: the one allowed GSAP pattern is
- **`Reveal` / `useScrollReveal`** (opacity + `y` stagger, triggered once when a container scrolls into view), only where it softens a data-heavy result set appearing all at once: the stat-card grids on `/ai/yield` and `/ai/recommendations`. Do not add it to ordinary lists (tasks, workers, reviews); it was removed from those deliberately.
- `Flip` for the expand/collapse of field rows on the farm page (layout continuity, not decoration).

Public site `(marketing)`: one scroll-linked interaction, the story section (`StorySequence`), whose sticky preview follows the step being read. In-page links are plain anchors with CSS smooth scrolling (off under `prefers-reduced-motion`).

Removed on purpose, do not re-add: Lenis smooth-scroll, magnetic buttons, character-split headline reveals, counting-up numbers (`StatValue` shows the number as is), Ken Burns photo zoom, pulsing "live" dots.

Rationale: authenticated screens are task-driven and used daily; anything that delays reading a number or moves on its own is a cost, not a feature.
