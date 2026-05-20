## Settings page + working dark mode toggle

Scope: visual + small state wiring only. No schema, no queries, no route changes. Existing Settings dialog in `src/routes/__root.tsx` is replaced; dropdown gets a real switch.

### 1. New Settings dialog (replaces the placeholder one in `__root.tsx`)

Triggered the same way (profile dropdown → Settings). Built as a large modal so it matches the prototype's two-pane layout.

Layout (matches uploaded prototype):

```text
┌──────────────┬──────────────────────────────────────────┐
│ Edit Profile │  [avatar]  Jane Citizen · Researcher     │
│              │            jane.citizen123@email.com     │
│ General      │            eAsia | Australia        [x]  │
│ Security     ├──────────────────────────────────────────┤
│ Linked Accts │  Name      [ Jane Citizen           ]    │
│ Team Mgmt    │  Role      Change role in Team Mgmt ↗    │
│              │  Email     [ jane.citizen123@…      ]    │
│              │  Institution [ eAsia (disabled)     ]    │
│              │  Country   [ Australia              ]    │
└──────────────┴──────────────────────────────────────────┘
```

- Left rail: coral (`bg-coral/bg-surface-hover`) panel, ~200px wide, with `Edit Profile` header and four nav items (General / Security / Linked Accounts / Team Management). Active item = solid coral block + white text. Inactive = ink on cream.
- Right pane: cream `bg-surface`. Top header strip shows avatar with "Replace image" caption, name + role, email (coral link), and `eAsia | Australia` meta. Close (X) top-right.
- Form section below a hairline divider: stacked field rows with coral uppercase-ish labels (`text-coral font-semibold text-[13px]`), inputs styled `bg-surface-hover/40 border border-hairline rounded-md h-10 px-3 text-ink`. Role row is read-only text with a `Team Management ↗` link.
- Only the **General** panel is implemented now (matches the screenshot); Security / Linked Accounts / Team Management render a simple "Coming soon" placeholder so the nav still works.
- Form is **non-functional** (no Supabase calls). Values are local component state seeded with the placeholder data from the mock. A disabled `Save changes` button sits at the bottom right of the right pane (kept disabled with a "coming soon" tooltip-style helper text) so the layout reads as a real settings page without wiring anything to the backend.
- Built with existing shadcn `Dialog` (widened: `max-w-[880px]`, `p-0`, `overflow-hidden`, `rounded-2xl`). Internal grid: `grid-cols-[200px_1fr]`.

### 2. Dark mode toggle — make it actually work + real switch

Currently the dropdown item just flips a `useState` and does nothing. Two changes:

a. **Wire it up.** Add a tiny `useDarkMode` hook (in `__root.tsx`, local) that:
   - reads initial value from `localStorage.getItem('lotus-theme')`, fallback to `false`
   - on toggle, adds/removes `dark` class on `document.documentElement` and writes back to localStorage
   - applies the class on mount via `useEffect`
   
   The `.dark` selector already exists in `src/styles.css` (line 139) so toggling the class is enough to satisfy "works"; we are not redesigning the dark palette in this pass.

b. **Real switch UI in the dropdown.** Replace the `Check` icon with the existing shadcn `<Switch>` component, restyled to match the uploaded pink pill:
   - Track: `bg-coral-muted/40` off, `bg-coral` on
   - Thumb: white, slightly larger (`h-5 w-5`), soft shadow
   - Sizing: `h-6 w-11`, fully rounded
   - Done via `className` overrides on `Switch` — no edits to `src/components/ui/switch.tsx`.
   
   The dropdown row uses `onSelect={(e) => e.preventDefault()}` so clicking the switch doesn't close the menu, and the row label "Dark mode" sits left with the switch right-aligned.

### Files touched

- `src/routes/__root.tsx` — replace placeholder Settings Dialog body with the two-pane layout; replace dark-mode dropdown row with `<Switch>` + working hook.

### Not touched

- `src/styles.css` (tokens unchanged)
- `src/components/ui/switch.tsx` (restyled via className only)
- Any route, query, or the 13 functional fixes.
