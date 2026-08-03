import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";
import { baseConfig } from "./base.js";

/**
 * ESLint configuration for Svelte packages, layered on top of {@link baseConfig}.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const svelteConfig = ts.config(...baseConfig, ...svelte.configs["flat/recommended"], ...svelte.configs["flat/prettier"], {
    // `.svelte.ts` rune modules go through svelte-eslint-parser too, and it needs the
    // TypeScript parser handed to it or their type syntax fails to parse.
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
        parserOptions: {
            parser: ts.parser,
        },
    },
    rules: {
        // Naming a value on its own line inside `$effect` is how you register it as a
        // dependency in Svelte 5. The rule reads those as dead expressions.
        "@typescript-eslint/no-unused-expressions": "off",

        // Every Map, Set and Date we build is a local temporary inside a function or a
        // `$derived.by`, never reactive state, so the Svelte wrappers buy nothing here.
        "svelte/prefer-svelte-reactivity": "off",

        // `resolve()` only matters once the app is served from a base path, which it
        // isn't. Turn this back on if that ever changes.
        "svelte/no-navigation-without-resolve": "off",
    },
});
