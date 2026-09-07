/**
 * Conventional-commit rules for this repo, applied to each commit by
 * .husky/commit-msg. git-cliff reads the same commits to derive the next version
 * and the CHANGELOG section, so a message that fails here is one it will drop.
 *
 * @type {import("@commitlint/types").UserConfig}
 */
export default {
    extends: ["@commitlint/config-conventional"],
};
