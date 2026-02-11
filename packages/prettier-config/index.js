/**
 * Base Prettier configuration for the monorepo (no plugins)
 * @type {import("prettier").Config}
 */
const config = {
    tabWidth: 4,
    printWidth: 150,
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
