# Design System

A reference for styling conventions used across the web app. Follow these rules strictly to ensure visual consistency.

---

## Color Palette - Stone

All UI elements use Tailwind's **Stone** palette as the foundation.

| Role               | Class                 |
| :----------------- | :-------------------- |
| Main background    | `bg-stone-950`        |
| Surface background | `bg-stone-900`        |
| Primary text       | `text-stone-50`       |
| Secondary text     | `text-stone-200`      |
| Tertiary text      | `text-stone-400`      |
| Borders            | `border-stone-700/50` |
| Backdrop blur      | `backdrop-blur-sm`    |

> [!NOTE]
> Only the three text colors above are allowed. `CocBtn` and CoC-related components are exceptions — they have independent theme variations (Green, Orange, Red, Blurple) and are not bound by the Stone palette rule.

---

## Borders

- **Width:** `border-2` — uniform and pronounced outline everywhere.
- **Color:** `border-stone-700/50` — the only allowed border color.
- **Variant exception:** Components with color variants (e.g. `<Badge />`, `<Button />`) may use `border border-<color>-700/50` paired with `bg-<color>-900`.

---

## Border Radius

| Radius        | Usage                                              |
| :------------ | :------------------------------------------------- |
| `rounded-lg`  | Buttons, tooltips, popovers, cards, menus, navbars |
| `rounded-2xl` | Large content panels (admin and dashboard views)   |

**Exceptions:**
- `ControlsPopup.svelte` — the floating trigger button uses `rounded-full`. Inner buttons inside the popup remain `rounded-lg`.
- `CocBtn` — may use `rounded-xl` or `rounded-[10px]` as it has an independent theme.
- Floating button container in `<ReadmeEditor />` — uses `rounded-xl`.

---

## Animations & Transitions

| Property   | Value                                                             |
| :--------- | :---------------------------------------------------------------- |
| Transition | `transition-all` (or `transition-colors`, `transition-transform`) |
| Duration   | `duration-200`                                                    |
| Easing     | `ease-in-out`                                                     |

All interactive elements (hovers, focus states, popovers) must use `duration-200` for a snappy but smooth feel.

---

## Spacing & Sizing

Use a base-2 scale for all spacing properties (`gap`, `p`, `m`, `w`, `h`, `size`).

**Allowed values:** `2`, `4`, `6`, `8`, `10`, `12`, `14`, `16`, `20`, `24`, ...

- Use `1` or `0.5` only for ultra-fine micro-adjustments (e.g. borders, `px-1.5` required by an external component).
- Prefer `gap-4` over `gap-3`. Prefer `px-4 py-2` over `px-3 py-1.5` for buttons.

---

## Z-Index Scale

A fixed z-index scale prevents stacking conflicts. Do not invent values outside this table.

| Z-Index  | Usage                               | Examples                                                               |
| :------- | :---------------------------------- | :--------------------------------------------------------------------- |
| `-z-10`  | Background artwork, videos          | Background video loops, ambient gradients                              |
| `z-0`    | Standard page content               | Text, images, grids, inline buttons                                    |
| `z-10`   | Elevated content, sticky headers    | Sticky section headers                                                 |
| `z-30`   | Body-level floating overlays        | `CocPopup` in body content (stays below navbar)                        |
| `z-40`   | Global persistent floating UI       | `Navbar` only                                                          |
| `z-60`   | Tooltips, popovers, drawers         | `ControlsPopup`, `Button` tooltips, `Popover`, `Drawer`                |
| `z-9999` | Top-level overlays above everything | `CocPopup` with `aboveNavbar={true}`, `ControlsPopup`, certain drawers |

> [!NOTE]
> `CocPopup` accepts an `aboveNavbar` prop:
> - `aboveNavbar={false}` (default): `z-30` — stays below the navbar.
> - `aboveNavbar={true}`: `z-9999` — appears above the navbar.

> [!WARNING]
> **Tooltips inside Dialogs**
>
> Both `<Dialog>` and `<Tooltip>` use Ark UI `<Portal>`, which appends to `<body>`, making them siblings in the same stacking context. A tooltip positioner sits at `z-60`; a dialog positioner sits at `z-9999` — so the tooltip renders underneath the dialog.
>
> Raising the z-index on `Tooltip.Content` alone won't fix this: the parent `Tooltip.Positioner` already establishes a stacking context at `z-60`, so any child z-index is resolved inside that context.
>
> **Solution:** `<Dialog>` sets a `render-inline` Svelte context. `<Tooltip>` reads it and passes `disabled` to its `<Portal>`, rendering inline inside the dialog's `z-9999` stacking context instead of portaling to `<body>`. This is automatic — no per-button changes needed.
>
> Apply the same pattern (set a context → disable the portal) whenever a `z-60` overlay must appear above a `z-9999` container.
