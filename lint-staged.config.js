/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
  "*.{js,jsx,cjs,mjs,ts,tsx,cts,mts,json,jsonc,md,mdx,html,css,scss,svelte,yml,yaml}":
    "prettier --write",
  "**/package.json": "sort-package-json",
};
