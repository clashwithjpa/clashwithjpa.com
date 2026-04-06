#  Contributing

Thank you for considering contributing to our project! We welcome contributions from the community and are excited to have you on board. Below are some guidelines to help you get started. Join our Discord server if you have any questions or need assistance.

## Running the project

To run the project locally, follow these steps:

### Setup Dependencies

1. Install Bun (https://bun.com/docs/installation)
2. Install project dependencies:
   ```bash
   bun install
   ```

### Setup Development Environment

1. Start the required docker services & analytics:
    ```bash
    make run -- all
    ```

2. Setup the environment variables by copying the example file and filling in the required values. There are few .env files for different parts of the project, so make sure to copy all of them:
    ```bash
    cp apps/server/.env.example apps/server/.env
    cp apps/server/.env.server-db.example apps/server/.env.server-db
    cp apps/web/.env.example apps/web/.env
    ```

3. Whenever you reset db (e.g. `make db-reset`, which removes the docker volume for the database), run the following commands to setup the database schema:
    ```bash
    make migrate
    ```

    Optionally, you can seed the database for some tables with:
    ```bash
    bun --filter server dataset:migrate
    ```

    You need certain `.csv` files in `apps/server/prisma/dataset/` to run the seeding, which are not included in the repo. Join the Discord and ask for access if you need them.

### Start the development servers
1. Start the development servers for both the web app and the server:
    ```bash
    turbo run dev
    ```

This will start the web app on `http://localhost:5173` and the server on `http://localhost:3000`.

### Additional Info

- If you change the database schema (files in `apps/server/src/lib/db/schema`, other than ba-auth.ts), you need to run `make generate` to generate the migration files, and then run `make migrate` to apply the changes to the database.
- If you make any changes to auth file, which also affects the database schema of auth, you need to run `bun --filter server ba:generate`, which automatically generates the schema for auth. Then you need to generate migration files with `make generate` and apply the migration with `make migrate`.
- If you want to run only the web app or the server, you can run the following commands:
    ```bash
    bun --filter web dev
    bun --filter server dev
    ```

    This applies for other commands they are configured with too.

---

## Web App Styling Guidelines

### Theme Palette: **Stone**

The entire application relies primarily on Tailwind CSS's **Stone** color palette (`stone-50` through `stone-950`).
- **Main Backgrounds:** `bg-stone-950`
- **Surface/Elevated Backgrounds:** `bg-stone-900`
- **Primary Text:** `text-stone-50`
- **Secondary Text:** `text-stone-200`
- **Tertiary Text:** `text-stone-400`
- **Borders:** `border-stone-700/50`
- **Backdrop Blur:** `backdrop-blur-sm`

> [!NOTE]
>  DO NOT use any text colors other than the 3 defined above. The `CocBtn` component has its own independent theme variations (Green, Orange, Red, Blurple) and other coc related components are exceptions to the strict Stone palette rule.

### Borders

- **Border Width:** `border-2` (Provides a stable, pronounced, and uniform outline).
- **Border Color:** Strictly `border-stone-700/50` EVERYWHERE where a border is used, no other border color is allowed.
- **Variants:** (*exception*): `border` & `border-<color>-700/50` is used with `bg-<color>-900` for components having different `varaints`, like `<Badge />` and `<Button />` components.

### Buttons
- **Variants:** Buttons must strictly fall into these variants:
    - **base:** `bg-stone-800`
    - **ghost:** `bg-stone-900`
- **Hover States:**
    - Both the `base` and `ghost` variants use `hover:bg-stone-700` and `hover:text-stone-50` for their hover states.
    - In `<Select />` component, `hover:bg-stone-700/50` is used for options.

### Border Radius (Rounded Corners)

- **Standard Radius:** `rounded-lg`
    - **Apply to:** Buttons, Tooltips, Popovers, Cards, Menus, Navbars.
- **Content Radius (*for admin and dashboard*)**: `rounded-2xl` for larger containers like content panels.
- **Exceptions:**
    - `ControlsPopup.svelte` (The audio/video controls trigger) is the **only** component allowed to use `rounded-full` for its floating trigger button. Inner buttons within the popup should adhere to `rounded-lg`.
    - `CocBtn` may maintain its specific radius (`rounded-[10px]` or `rounded-xl`) as it has an independent theme.
    - Floating button container in `<ReadmeEditor />` uses `rounded-xl`.

### Animations & Transitions

- **Standard property:** `transition-all` (or `transition-colors`, `transition-transform`)
- **Standard duration:** `duration-200`
- **Easing:** `ease-in-out` (default Tailwind easing or explicit).

Everything interactive (hovers, focus states, popovers) must use `duration-200` to maintain a snappy but smooth feel.

### Spacing & Sizing Scale

To prevent a messy combination of different margin/padding/gap and sizing values, we stick to a strict base-2 derived scale whenever possible for dimensions (`gap`, `p`, `m`, `size`, `w`, `h`).
- **Allowed values:** Choose spacing from `2`, `4`, `6`, `8`, `10`, `12`, `14`, `16`, `20`, `24`, etc.
- **Micro-adjustments:** The value `1` or `0.5` can be used *only* for ultra-fine adjustments (like borders or `px-1.5` if technically required by an external component), but aim to use `2` or `4` primarily.
- **Example:** Always prefer `gap-4` over `gap-3`. Keep `px-4 py-2` over `px-3 py-1.5` for buttons where possible.

### Managed Z-Index Scale

To prevent z-index wars and spaghetti overlay positioning, adhere strictly to the following mapped scale:

| Z-Index      | Usage                                                 | Examples                                                                                                       |
| :----------- | :---------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **`-z-10`**  | Background artwork, videos                            | Background video loops (`#bg-video`), ambient gradients                                                        |
| **`z-0`**    | Standard page content                                 | Text, standard images, grids, inline buttons                                                                   |
| **`z-10`**   | Elevated content, sticky headers                      | Sticky section headers (*rarely needed*)                                                                       |
| **`z-30`**   | Body-level floating overlays                          | `CocPopup` in body content (*stays below navbar*)                                                              |
| **`z-40`**   | Global persistent floating UI                         | `Navbar` component only                                                                                        |
| **`z-60`**   | Tooltips, popovers, drawers etc...                    | `ControlsPopup`, `Button` (*for tooltips*), `Popover`, `Drawer` components                                     |
| **`z-9999`** | Top level floating components appears over everything | `CocPopup` with `aboveNavbar={true}` (*user avatar dropdown*), `ControlsPopup` component and different Drawers |

Do not invent intermediate z-indexes outside of this scale.

> [!NOTE]
> The `CocPopup` component accepts an `aboveNavbar` prop
>   - `aboveNavbar={false}` (default): Uses `z-30` for body popups that should stay below the navbar
>   - `aboveNavbar={true}`: Uses `z-9999` for navbar popups that should appear above the navbar

---

*Remember: Check this guide before contributing new components to ensure consistency!*