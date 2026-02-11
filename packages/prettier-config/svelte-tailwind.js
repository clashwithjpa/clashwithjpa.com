import baseConfig from "./index.js";

/**
 * Prettier configuration with Svelte and TailwindCSS support
 * @type {import("prettier").Config}
 */
const config = {
    ...baseConfig,
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
