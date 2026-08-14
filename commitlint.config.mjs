/**
 * Mirrors the conventional-commit style already enforced on PR titles by
 * .github/workflows/semantic-pull-request.yml, applied to individual commits too.
 *
 * @type {import("@commitlint/types").UserConfig}
 */
export default {
    extends: ["@commitlint/config-conventional"],
};
