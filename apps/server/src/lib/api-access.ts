/**
 * Which parts of the API an API key is allowed to reach.
 *
 * Keys authenticate against the same routes the web app uses rather than a
 * separate surface, so this list is the boundary. It is imported by two places
 * that must never disagree:
 *
 *   - `betterAuthMiddleware` (lib/middlewares.ts) - rejects key-authenticated
 *     requests to anything not listed here, before the handler runs.
 *   - the `/openapi.json` handler (index.ts) - in production the document is
 *     filtered down to exactly this surface, so the published docs can't
 *     advertise something a key would be refused on.
 *
 * Being on the allowlist only gets a request past the door. The key still needs
 * the matching `jpa` scope, and the key's owner still needs the role that grants
 * it - see `hasAccessAuthMiddleware`.
 */

// Route prefixes an API key may authenticate against.
export const API_KEY_ALLOWED_PREFIXES = ["/coc", "/admin", "/analytics", "/manage", "/rules", "/privacy"] as const;

/**
 * Denials take priority over the allowlist.
 *
 *   /api/auth  : session, admin-plugin and api-key management. A key must never
 *                be able to mint or re-scope keys, ban users, or revoke
 *                sessions; that would make key theft self-escalating.
 *   /user      : self-scoped endpoints ("my accounts", "my CWL", "apply").
 *                They only mean something for a human in a browser session; a
 *                bot acting as "itself" isn't a concept we want to support.
 *   /upload    : multipart file upload, browser-only.
 *   /api-keys  : the dashboard's own usage-stats endpoints. Cookie-authed;
 *                a key reading its own analytics is not a use case worth the
 *                extra surface.
 */
export const API_KEY_DENIED_PREFIXES = ["/api/auth", "/user", "/upload", "/api-keys"] as const;

function matchesPrefix(path: string, prefix: string): boolean {
    // Exact match, or a genuine path segment boundary - so "/user" never
    // accidentally matches "/users" and "/api-keys" never matches "/api-keysfoo".
    return path === prefix || path.startsWith(`${prefix}/`);
}

export function isApiKeyAllowedPath(path: string): boolean {
    if (API_KEY_DENIED_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) return false;
    return API_KEY_ALLOWED_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}
