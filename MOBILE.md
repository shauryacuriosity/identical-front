# Mobile layout notes

## Breakpoints

| Width | Target |
|-------|--------|
| **390px** | Phone — no page-level horizontal scroll on Home, Datasets, AI Analysis |
| **768px** | Tablet — sidebars stack above main content |
| **1280px** | Desktop — full header tabs and side-by-side panels |

## Navigation

- **≥1024px:** Full pill nav in the header.
- **<1024px:** Compact header + bottom tab bar (Home, Datasets, Charts, AI). Main content has extra bottom padding so nothing sits under the bar.

## Pages

- **Home:** Project cards on narrow screens; table from `md` up.
- **Datasets:** Attributes panel stacks above the pipeline below `lg`.
- **Visualisation:** Chart canvas first on mobile; builder rail below.
- **AI Analysis:** Scrollable step indicator; stacked mapping rows; 44px touch targets on primary actions.
- **Run results:** Flexible SHAP layout and larger pagination controls on small screens.

## Quick check

```bash
npm run dev
```

Use DevTools device mode at 390×844 and 1280×800. Production: https://identical-front.vercel.app
