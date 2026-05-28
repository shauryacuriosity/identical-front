# Mobile layout notes (Wave 3 — D1)

## Navigation

- **≥1024px (`lg`)**: Full pill nav in header (Home brand + Datasets / Visualisation / AI Analysis).
- **<1024px**: Compact header (brand + account only) + **fixed bottom tab bar** (`MobileBottomNav`) with 44px touch targets.

Main content has `pb-20` below `lg` so rows are not hidden behind the tab bar.

## Page layouts

| Page | Mobile behaviour |
|------|------------------|
| **Home** | Responsive greeting; project table in horizontal scroll wrapper (`min-w-[520px]`) — no page-level overflow. |
| **Datasets** | Attributes sidebar stacks above pipeline (`flex-col` → `lg:flex-row`). |
| **Visualisation** | Chart rail stacks above canvas (`grid-cols-1` → `lg:grid-cols-[280px_1fr]`). |
| **AI Analysis** | Single column; `overflow-x-hidden` on page root. |

## Viewports to spot-check

| Width | Device class | Check |
|-------|----------------|-------|
| **390px** | iPhone | Bottom nav, login, home table scroll, datasets stack |
| **768px** | Tablet | Datasets sidebar height cap; viz rail |
| **1280px** | Desktop | Full header tabs; no bottom nav |

## Manual QA checklist

- [ ] No horizontal page scroll on Home at 390px (table may scroll inside card).
- [ ] Primary CTAs (action tiles, bottom nav) tappable without zoom.
- [ ] Focus rings visible when tabbing through nav and table rows.
