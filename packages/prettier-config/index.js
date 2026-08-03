/**
 * Base Prettier configuration for the monorepo.
 *
 * `importOrder` mirrors the grouping VS Code's "Organize Imports" produces, so saving
 * in the editor and running `pnpm format` agree: aliases (`$app`, `$lib`), then scoped
 * packages, then bare packages, then `~icons`, then relative paths. One difference is
 * that this collapses blank-line-separated import groups into a single sorted block,
 * where the editor sorts each group where it stands.
 *
 * @type {import("prettier").Config}
 */
const config = {
    tabWidth: 4,
    printWidth: 150,
    plugins: ["@ianvs/prettier-plugin-sort-imports"],
    importOrder: ["^[$]", "^[@]", "^[a-z]", "^[~]", "^[.]"],
    // Side-effect imports are left where they sit by default, since their order can
    // matter. Stylesheets are the exception — they only need base-before-theme, which
    // alphabetical already gives us — so let them sort like the editor does. Anything
    // else (`dotenv/config`, `unplugin-icons/types/svelte`) still stays put.
    importOrderSafeSideEffects: ["^.*\\.css$"],
    overrides: [
        {
            files: ["*.yml", "*.yaml"],
            options: {
                tabWidth: 2,
            },
        },
    ],
};

export default config;
