/**
 * Base Prettier configuration for the monorepo (no plugins)
 * @type {import("prettier").Config}
 */
const config = {
    useTabs: false,
    tabWidth: 4,
    singleQuote: true,
    trailingComma: "all",
    printWidth: 150,
    semi: true,
};

export default config;
