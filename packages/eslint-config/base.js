import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import ts from "typescript-eslint";

/**
 * Shared ESLint configuration for every package in the monorepo.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const baseConfig = ts.config(
    {
        ignores: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.turbo/**", "**/src/gen/**"],
    },
    js.configs.recommended,
    ...ts.configs.recommended,
    prettier,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
);
