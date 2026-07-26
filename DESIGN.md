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

There is **no animation library**. Everything is CSS — keyframes in `routes/layout.css`, plus [`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) utilities. Do not add one back.

### Interactive states

| Property   | Value                                                             |
| :--------- | :---------------------------------------------------------------- |
| Transition | `transition-all` (or `transition-colors`, `transition-transform`) |
| Duration   | `duration-200`                                                    |
| Easing     | `ease-in-out`                                                     |

All hovers, focus states and popovers use `duration-200` for a snappy but smooth feel.

### Easings

| Token             | Curve                            | Used by                    |
| :---------------- | :------------------------------- | :------------------------- |
| `ease-glide`      | `cubic-bezier(0.33, 1, 0.68, 1)` | Entrances, page transition |
| `ease-glide-soft` | `cubic-bezier(0.25, 1, 0.5, 1)`  | Card and child stagger     |

### Entrances

| What                       | How                                                         |
| :------------------------- | :---------------------------------------------------------- |
| One element                | `animate-in fade-in duration-800 ease-glide fill-mode-both` |
| List, indexed stagger      | `.stagger-fade` / `.stagger-up` + `style="--i:{i}"`         |
| A container's own children | `.stagger-children` on the parent                           |

- `.stagger-fade` fades over `800ms`, `.stagger-up` fades and rises `100%` over `200ms`; both step `150ms` per `--i`.
- `.stagger-children` slides its **direct children** up `30px` from `scale(0.95)` over `200ms`, starting at `100ms` and stepping `80ms` (flat from the 8th child).
- `fill-mode-both` is required — without it a delayed element flashes at full opacity before it starts.
- Never ship an element that is invisible until JS runs (`opacity-0` + a script). The animation must be the thing that reveals it.

### Named animations

| Utility                | Purpose                      | Requires                                                      |
| :--------------------- | :--------------------------- | :------------------------------------------------------------ |
| `.page-enter`          | Page transition, `800ms`     | A `{#key}` on the routed content — see below                  |
| `.press`               | Pointer squish + spring back | Built into `<Button />` via `animateClick`                    |
| `.glide-char`          | Per-character heading rise   | Characters split in markup, parent clips, `--i` per character |
| `animate-wavy-bounce`  | Logo pop-in, `900ms`         | —                                                             |
| `animate-float-sprite` | Endless hover drift          | `--float-distance`, `--float-duration`, `--float-delay`       |
| `animate-ring-draw`    | Draws an SVG ring stroke     | `[stroke-dasharray:<circumference>]`                          |
| `animate-ring-empty`   | Erases it again              | Same, plus `onanimationend` to unmount                        |

`.press` squishes to `0.95` in `100ms` and overshoots back to ~`1.05` on release via a back-out easing — no JS, and it supersedes `transition-colors` on the same element.

### Page transitions

The routed content is wrapped in `{#key page.url.pathname}` with `.page-enter` in `(auth)/+layout.svelte`. This is the **only** navigation animation — pages must not fade themselves in on mount.

> [!NOTE]
> The View Transitions API is deliberately unused. Its root snapshot cross-fades the whole document, sidebar included, which reads as a full-page blink. Keying on `pathname` also means query-param changes (filters, pagination) don't replay the animation.

### Enter/exit of conditional blocks

Use Svelte's built-in transitions (`transition:slide`, etc.) for `{#if}` blocks that open and close. Reserve the Web Animations API (`el.animate()`) for sequenced timelines that flip state mid-flight — nothing else needs JS.

> [!WARNING]
> **Never put a class animation on an element that also has a Svelte transition.**
>
> Svelte applies its transition as an *inline* `animation`, which wins while the transition runs. The moment it clears that inline style the class animation takes over and replays — so the element slides in correctly, then pops. Exits look fine because the inline style survives until unmount, which makes it read as an in/out mismatch.
>
> `animate-none` does not fix it: `.stagger-children > *:nth-child(n)` outranks it, and these rules are unlayered so they beat Tailwind utilities anyway. Restructure instead — move the stagger to an inner wrapper so the transitioning element is a plain sibling.

### Reduced motion

`.glide-char`, `.stagger-fade`, `.stagger-up`, `.stagger-children > *`, `.page-enter` and `.press` are all disabled under `prefers-reduced-motion: reduce`. Anything new that moves belongs in that block too.

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
