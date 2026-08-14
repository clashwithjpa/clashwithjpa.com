/**
 * Runs on staged files only, so commits stay fast — the full `pnpm lint` / `pnpm format:check`
 * still run in CI over the whole repo.
 *
 * @type {import("lint-staged").Config}
 */
export default {
    "*.{js,cjs,mjs,ts,cts,mts,svelte,json,jsonc,md,yml,yaml,css,html}": ["prettier --write"],
    // Package-local eslint binaries, since pnpm's isolated node_modules doesn't hoist
    // them to the root — `pnpm exec eslint` from root can't resolve them otherwise.
    "apps/web/**/*.{js,ts,svelte}": ["apps/web/node_modules/.bin/eslint --fix"],
    "apps/server/**/*.{js,ts}": ["apps/server/node_modules/.bin/eslint --fix"],
    "packages/clashofclans-api/**/*.{js,ts}": ["packages/clashofclans-api/node_modules/.bin/eslint --fix"],
};
