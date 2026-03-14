# Web App Styling Guidelines

## Theme Palette: **Stone**

The entire application relies primarily on Tailwind CSS's **Stone** color palette (`stone-50` through `stone-950`).
- **Main Backgrounds:** `bg-stone-950`
- **Surface/Elevated Backgrounds:** `bg-stone-900`
- **Primary Text:** `text-stone-50` (*`text-stone-950` for light bg*)
- **Secondary Text:** `text-stone-200` (*`text-stone-400` for light bg*)
- **Tertiary Text:** `text-stone-400` (*`text-stone-600` for light bg*)
- **Borders:** `border-stone-700/50`
- **Backdrop Blur:** `backdrop-blur-sm`

> **Note:** DO NOT use any text colors other than the 3 defined above. The `CocBtn` component has its own independent theme variations (Green, Orange, Red, Blurple) and is an exception to the strict Stone palette rule.

## Borders

- **Border Width:** `border-2` (Provides a stable, pronounced, and uniform outline).
- **Border Color:** Strictly `border-stone-700/50` EVERYWHERE where a border is used, no other border color is allowed.

## Buttons & Contrast

- **Variants:** Buttons must strictly fall into these variants:
    - **base:** `bg-stone-800`
    - **ghost:** `bg-stone-900`
- **Hover States:** Both the `base` and `ghost` variants use `hover:bg-stone-700` and `hover:text-stone-50` for their hover states.

## Border Radius (Rounded Corners)

- **Standard Radius:** `rounded-lg`
    - **Apply to:** Buttons, Tooltips, Popovers, Cards, Menus, Navbars.
- **Exceptions:**
    - `ControlsPopup.svelte` (The audio/video controls trigger) is the **only** component allowed to use `rounded-full` for its floating trigger button. Inner buttons within the popup should adhere to `rounded-lg`.
    - `CocBtn` may maintain its specific radius (`rounded-[10px]` or `rounded-xl`) as it has an independent theme.

## Animations & Transitions

- **Standard property:** `transition-all` (or `transition-colors`, `transition-transform`)
- **Standard duration:** `duration-200`
- **Easing:** `ease-in-out` (default Tailwind easing or explicit).

Everything interactive (hovers, focus states, popovers) must use `duration-200` to maintain a snappy but smooth feel.

## Spacing & Sizing Scale

To prevent a messy combination of different margin/padding/gap and sizing values, we stick to a strict base-2 derived scale whenever possible for dimensions (`gap`, `p`, `m`, `size`, `w`, `h`).
- **Allowed values:** Choose spacing from `2`, `4`, `6`, `8`, `10`, `12`, `14`, `16`, `20`, `24`, etc.
- **Micro-adjustments:** The value `1` or `0.5` can be used *only* for ultra-fine adjustments (like borders or `px-1.5` if technically required by an external component), but aim to use `2` or `4` primarily.
- **Example:** Always prefer `gap-4` over `gap-3`. Keep `px-4 py-2` over `px-3 py-1.5` for buttons where possible.

## Managed Z-Index Scale

To prevent z-index wars and spaghetti overlay positioning, adhere strictly to the following mapped scale:

| Z-Index     | Usage                                 | Examples                                                         |
| :---------- | :------------------------------------ | :--------------------------------------------------------------- |
| **`-z-10`** | Background artwork, videos            | Background video loops (`#bg-video`), ambient gradients          |
| **`z-0`**   | Standard page content                 | Text, standard images, grids, inline buttons                     |
| **`z-10`**  | Elevated content, sticky headers      | Sticky section headers (rarely needed)                           |
| **`z-40`**  | Global persistent floating UI         | `Navbar`, `ControlsPopup` trigger (the floating button itself)   |
| **`z-60`**  | Floating overlays (Popovers/Tooltips) | `Tooltip.Positioner`, `Popover.Positioner` (Tooltips, Dropdowns) |

Do not invent intermediate z-indexes (like `z-70` or `z-80`) outside of this scale.

---

*Remember: Check this guide before contributing new components to ensure consistency!*