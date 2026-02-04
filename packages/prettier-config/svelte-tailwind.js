/**
 * Prettier configuration with Svelte and TailwindCSS support
 * @type {import("prettier").Config}
 */
const config = {
    useTabs: false,
    tabWidth: 4,
    singleQuote: true,
    trailingComma: "all",
    printWidth: 150,
    semi: true,
    plugins: ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
    overrides: [
        {
            files: "*.svelte",
            options: {
                parser: "svelte",
            },
        },
    ],
};

export default config;
