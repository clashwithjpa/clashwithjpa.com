import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";
import { baseConfig } from "./base.js";

/**
 * ESLint configuration for Svelte packages, layered on top of {@link baseConfig}.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const svelteConfig = ts.config(...baseConfig, ...svelte.configs["flat/recommended"], ...svelte.configs["flat/prettier"], {
    files: ["**/*.svelte"],
    languageOptions: {
        parserOptions: {
            parser: ts.parser,
        },
    },
});
