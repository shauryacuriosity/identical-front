# UI polish changelog (Wave 3 — D2)

## Contrast

- Darkened `--text-muted` and introduced `--text-tertiary` for `ink-2` / `ink-3` on pink surfaces (closer to WCAG AA for body copy).
- Form labels use `text-coral-deep` instead of bright coral on white cards.
- Focus rings use `coral-deep` with 2px outline on interactive elements.

## Depth / shadows

- Added utility classes `.shadow-card` and `.shadow-elevated` tied to design tokens.
- Home project table uses `shadow-card` instead of inline rgba strings.
- Datasets sidebar uses `shadow-card` for consistency with action tiles.

## Touch & accessibility

- Nav and account menu buttons: `min-h-[44px]` / `min-w-[44px]`.
- Slider thumbs: larger hit area via padding pseudo-element + `touch-manipulation`.
- Home row actions enlarged to 44px targets.

## Not changed

- eAsia / Lotus palette (coral, canvas pink, Montserrat).
- Brand marks and gradient settings dialog sidebar.
