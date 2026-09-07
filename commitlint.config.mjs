/**
 * The single source of conventional-commit rules: applied to each commit via
 * .husky/commit-msg, and to PR titles via .github/workflows/semantic-pull-request.yml.
 *
 * @type {import("@commitlint/types").UserConfig}
 */
export default {
    extends: ["@commitlint/config-conventional"],
};
