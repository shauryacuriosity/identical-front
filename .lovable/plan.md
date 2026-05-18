# Styling pass: adopt Adrian's Figma tokens

This is **styling only**. No layout, hierarchy, copy, component, or interaction is being changed. Every screen Sha built stays exactly as is — we're just retoning the surface.

## 1. Tokens adopted from Adrian's Figma (exact hex)

### Surfaces
| Token | Hex | Used for |
|---|---|---|
| `--canvas` (page bg) | `#fff5f5` | App background (replaces current warm-paper oklch) |
| `--surface` (card) | `#ffffff` | Cards, panels, modals |
| `--surface-hover` | `#f9d7d7` | Hover states, dropdown row highlight |

### Accent (coral identity)
| Token | Hex | Used for |
|---|---|---|
| `--coral` (accent primary) | `#e8928e` | Active tab pill, primary buttons, accent icons, ring |
| `--coral-hover` | `#e46576` | Hover on primary actions |
| `--coral-deep` (accent highlight) | `#6e4a4a` | Strong emphasis, used sparingly (e.g. selected chip border) |
| `--coral-muted` (accent text muted) | `#d4908a` | Secondary pink labels |

### Text
| Token | Hex |
|---|---|
| `--ink` (primary) | `#1e1e1e` |
| `--ink-2` (secondary, derived) | `#5a4a4a` |
| `--ink-3` (muted) | `#d4908a` |

### Borders
| Token | Value |
|---|---|
| `--hairline` (subtle) | `rgba(110, 74, 74, 0.12)` |
| `--hairline-strong` | `rgba(110, 74, 74, 0.24)` |
| `--hairline-grey` (neutral divider) | `#d9d9d9` |

### Status
Success `#7aab8a` · Warning `#9a9268` · Danger `#c08880` · Info `#7a9dc4`. Replaces the current `--data-sage/ochre/slate/plum` quad as the status quartet. (Note in §4 below about chart accents.)

## 2. Supplemented values (explanation for designer)

Adrian's export shipped one text style, magenta inset shadows, and no radius/spacing scale. Filling the gaps:

**Type scale** — only `Montserrat 12/400` existed. Added a full scale that breathes well in Montserrat:
- Display 32 / 600 / 1.15 / -0.01em
- H1 24 / 600 / 1.25
- H2 20 / 600 / 1.3
- H3 18 / 500 / 1.35
- Body 15 / 400 / 1.5
- Small 13 / 400 / 1.45
- Caption 11 / 500 / 0.04em / uppercase

**Font families** — Sans = **Montserrat** (Adrian's), Mono = **JetBrains Mono** (for filenames, row counts, column names, percentages). **Fraunces and Inter/Inter Tight are removed entirely** — every `font-serif` usage is rewritten to Montserrat, the Google Fonts `<link>` in `__root.tsx` drops both families.

**Shadows** — Adrian's exported magenta inset shadows (`rgba(214,56,101,1)`) read as experimental, not production. Replaced with brand-tinted subtle elevations:
- `--shadow-sm` (card): `0 1px 3px rgba(110,74,74,0.08), 0 1px 2px rgba(110,74,74,0.04)`
- `--shadow-md` (dropdown / modal): `0 4px 12px rgba(110,74,74,0.10), 0 2px 4px rgba(110,74,74,0.06)`
- Default to hairline borders over shadow where possible.

**Radii** — Card 14 / Button 10 / Input·chip·pill 8 / Dropdown 10.

**Spacing** — 8px base: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48.

## 3. Tokens dropped as noise

- `--paint-mobile_background_shaurya` (#f5fff7 green)
- `--paint-bg_light1` (#e1ff00 yellow-green)
- `--paint-bg_dark1/2/3` (purple-blue, unused)
- `--paint-hiwuebgobgo1/2/3` (nonsense-named pinks)
- `--paint-primary1` (#db111e — too saturated, conflicts with coral identity)
- All dark-mode tokens (`--bg-bg-dark`, `--bg-bg-light`, etc.) — app is light-mode only
- All `--effect-shadow_*` magenta inset shadows
- `--accent-secondary` `#0077ff` (off-brand blue, no usage)

## 4. One question for you before I touch the code

**Chart / data-series colors.** The current Visualisation + Results dashboard uses four data accents (`--data-sage/ochre/slate/plum`) for chart series, cluster scatter dots, and SHAP bars. Adrian's status quartet (success/warning/danger/info) is semantically wrong for arbitrary chart series — using "danger red" for cluster 3 would read as an alert.

Proposed: keep the four chart-accent slots but retint them to live inside Adrian's palette — sage stays (`#7aab8a`), add a warm ochre that harmonises with coral, a slate-blue from his info (`#7a9dc4`), and a deeper plum derived from his accent-highlight family. Status colors stay reserved for actual status (badges, toasts, validation).

If you'd rather chart series just cycle coral / coral-deep / coral-muted / slate-info, say the word.

## 5. "Lotus" mention

Adrian's brief mentions the internal project name "Lotus." Currently it appears nowhere in the build. Options:
- (a) Don't surface it — wordmark stays `eAsia WORKBENCH`, workspace label becomes `UOW eAsia`. Nothing else changes.
- (b) Add a small `Lotus · v0.1` line in the user menu or a footer.

Default to (a) unless you confirm (b).

## 6. Naming change

`UOW Capstone` → `UOW eAsia` in `src/routes/__root.tsx` (line 88). Wordmark `eAsia WORKBENCH` unchanged.

## 7. Confirmed unchanged (structural)

- Home: action toolbar row + Recent-as-hero with TYPE / MetS prevalence columns
- Datasets: Attributes sidebar, two dataset bars, Pipeline sentence header, chip strip, preview area, Save/Export footer
- AI Analysis: 4-step workflow (Map → Cohort → Method → Run), all step indicators and copy
- Results dashboard: 4-panel composition (Run summary + SHAP + Cluster scatter + Prediction table)
- Visualisation: layout untouched
- All breadcrumbs, sample data, copy, interactions

## 8. File-level scope

- `src/styles.css` — rewrite token block (`:root`), swap `--font-serif`/`--font-sans` for Montserrat, drop Fraunces, retune shadows + radius, update `body` font + `h1/h2/h3` block to use sans.
- `src/routes/__root.tsx` — swap Google Fonts `<link>` to `Montserrat:400,500,600,700` + `JetBrains Mono:400,500`; update `UOW Capstone` → `UOW eAsia`.
- `src/routes/index.tsx`, `src/routes/datasets.tsx`, `src/routes/ai-analysis.tsx`, `src/routes/ai-analysis.results.tsx`, `src/routes/visualisation.tsx` — strip `font-serif` classes and ad-hoc `font-serif text-[NN]px` inline blocks, replace with the type-scale classes/utilities. No JSX structure edits.

Tell me: chart-color direction (§4) and Lotus mention (§5), then I'll ship it in one pass.