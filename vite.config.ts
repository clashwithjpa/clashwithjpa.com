import { defineConfig } from "vite-plus";

export default defineConfig({
    fmt: {
        tabWidth: 4,
        printWidth: 150,
        overrides: [
            {
                files: ["**/*.yml", "**/*.yaml"],
                options: {
                    tabWidth: 2,
                },
            },
        ],

        // Needs the `svelte` package resolvable from the workspace root.
        svelte: true,

        // Without the stylesheet the custom `@theme` utilities (font-coc, ease-glide)
        // sort as unknown classes and every class list churns.
        sortTailwindcss: {
            stylesheet: "apps/web/src/routes/layout.css",
        },

        ignorePatterns: [
            "**/node_modules",
            "**/dist",
            "**/build",
            "**/.svelte-kit",
            "**/.turbo",
            "bun.lock",
            "logs",
            ".docs-preview",
            "**/*.md",
            "apps/web/android",
            "apps/web/ios",
        ],
    },

    lint: {
        ignorePatterns: ["**/node_modules", "**/dist", "**/build", "**/.svelte-kit", "**/.turbo", "apps/web/android", "apps/web/ios"],
        overrides: [
            {
                // Oxlint has no Svelte plugin yet, so these two misfire on runes idiom.
                files: ["**/*.svelte"],
                rules: {
                    // `$effect(() => { dep; ... })` reads a value purely to track it.
                    "no-unused-expressions": "off",
                    // `bind:this={el}` assigns from the template, which oxlint can't see.
                    "no-unassigned-vars": "off",
                },
            },
        ],
    },

    staged: {
        "*.{js,jsx,cjs,mjs,ts,tsx,cts,mts,json,jsonc,html,css,scss,svelte,yml,yaml}": "vp fmt --write",
    },
});
