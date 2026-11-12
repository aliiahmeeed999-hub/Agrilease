# agriLease design direction

**Limestone, olive and terracotta.** A light, paper-like interface for farmers in Morocco who use it on phones, often outdoors. Calm and trustworthy, rooted in a place rather than in a framework's defaults.

## 1. Audit: what read as generated

Line references are to the `apple-design-pass` branch (commit `ac14112`), the state before this pass.

| Signal | Where |
| --- | --- |
| Forced dark theme with a single saturated amber accent, the default "SaaS dark mode" look | `src/app/[locale]/layout.tsx:60` (`className="dark …"`), `src/app/globals.css:99-136` |
| Default framework font with no display face | `src/app/[locale]/layout.tsx:5-19` (Geist / Geist Mono) |
| Full-bleed photo under gradient scrims, slow zoom (Ken Burns) | `src/features/landing/components/Hero.tsx:19-36, 60-61` |
| Character-by-character headline reveal | `Hero.tsx:66` (`SplitHeadline`) |
| Magnetic (cursor-following) buttons | `Hero.tsx:73-89`, `FinalCta.tsx:17-25` |
| Vanity counters animating up from zero ("45 ha", "4 crop types", "3 equipment types": demo data presented as platform stats) | `Hero.tsx:40-44, 99`; also `OwnerStatTilesRow.tsx:53`, `AdminStatTilesRow.tsx:51`, `BankerStatTilesRow.tsx:26`, `ai/forecast/page.tsx:62` |
| Blurred glow blob behind a floating card | `StorySequence.tsx:308` (`blur-3xl`), `:310` (`shadow-xl shadow-black/5`) |
| Frosted-glass chrome | `globals.css:248-252` (`material-chrome`, `backdrop-filter: blur(20px)`) |
| Three identical numbered cards | `HowItWorks.tsx:23-34` |
| Centred card CTA, same rounded-3xl/border/padding as everything else | `FinalCta.tsx:12` |
| 138 `rounded-2xl` cards with the same ring; every surface the same shape | across `src/features/**` |
| Fade-in on scroll for ordinary lists | `tasks/page.tsx:81`, `workers/page.tsx:61`, `EquipmentReviewsCard.tsx:47`, `HowItWorks.tsx:16,23`, `FinalCta.tsx:12` |
| Hijacked scrolling (Lenis) | `(marketing)/layout.tsx:7`, `MarketingNav.tsx:6-11` |
| Pulsing "Live" dot | `StorySequence.tsx:102` |
| A roadmap item ("Coming next: AI-assisted planning") presented as a product story, with striped placeholder bars | `StorySequence.tsx:138-170` |
| Stock phrasing | `common.appTitle` "Smart Farm & Equipment Management", `marketing.hero.title` "…in one place", `marketing.footer.tagline` "Smart farm & equipment management", `marketing.finalCta.title` "Ready to get started?", `…subtitle` "bring your farm operations online", `story.forFarmersTitle` "at a glance", `calendar.subtitle` "in one view", `ownerConsole.dashboardSubtitle` "at a glance" |
| Next.js starter assets left in `public/` | `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` (unused) |

## 2. Direction

### Palette (all text pairs WCAG AA; checked numerically)

| Token | Colour | Why |
| --- | --- | --- |
| `--background` | limestone paper `#faf6ef` | Readable in sunlight; warmer than white, like the walls and soil of the region |
| `--foreground` | soil ink `#281c13` | Brown-black rather than blue-black; 15:1 on paper |
| `--primary` | olive `#48621e` | The one colour for actions. Olive groves, not "tech green" |
| `--terracotta` | clay `#b34f2a` | Signature accent: eyebrows, step numerals, the current-page marker. Never a button |
| `--info` | Chefchaouen blue `#1764a0` | "In progress" status only |

Status colours keep one meaning each: green done, blue in progress, ochre needs attention, red refused, grey inactive. Colour is never the only signal.

### Type

- **Fraunces** (soft, slightly wonky old-style serif) for `type-display`, `type-title-1` and `type-title-display-2` only: page titles and public-site section headings. It brings a printed, almanac-like warmth.
- **IBM Plex Sans + IBM Plex Sans Arabic** for everything else. One family across English, French and Arabic, with sturdy tabular figures for prices.
- Arabic titles use Plex Sans Arabic bold (Fraunces has no Arabic).
- Scale: display 40-76px, title-1 28-36px, section 30-48px, title-2 20px, headline 16px, body 15px, caption 13px.

### Shape and surface

- Corners: controls 8px, cards 12px, large panels 16px. Tags, not pills.
- 1px warm borders; no drop shadows, no blur, no glass.
- Icons: Lucide, 1.5-2px stroke, always paired with a word.

### Rhythm

Sections do not share one template. The hero is a 7/5 split with the photo offset; the story section is a sticky two-column scroll; "How it works" is a ruled list with the heading held to one side; the close is a full-width olive band.

### Signature details

1. **Furrows** (`bg-furrows`, `rule-furrows`): fine parallel lines like ploughed strips seen from the air. Behind the hero photo, the story preview, the top edge of empty states, under the sign-in header, above the footer.
2. **Ledger rows** (`ledger`, `ledger-fill`): label and figure joined by a dotted leader, like a price list or a farm account book. Used for specs, simulator totals, the equipment summary and the application recap.
3. **The terracotta bookmark**: the current page in the sidebar carries a short clay mark on its leading edge.

### Motion

One scroll-linked interaction on the public site (the story preview follows the step being read), `Flip` for expanding field rows, and the one-shot reveal on the two AI result grids. Everything else is still. See `AGENTS.md`.

## 3. Replace with real material

- **Hero photo** (`public/generated/landing/hero-poster.webp`) is AI-generated. Replace it with a real photograph of a partner farm: early light, real people or machines, and a true caption.
- **Story previews** use the demo farm "Ferme Ait Yahya" and illustrative figures. Replace them with real (anonymised) screenshots once there are real users, or keep them clearly illustrative.
- **Equipment listings** have no photos. Owner-uploaded photos of the actual machine are the strongest trust signal in a marketplace.
- **Testimonials**: none exist, and none were invented. One or two named quotes from real farmers or owners (with permission) would do more than any styling.
- **Region list** in the hero eyebrow (Fès-Meknès, Souss-Massa, Gharb, Doukkala) should match where you actually operate.
