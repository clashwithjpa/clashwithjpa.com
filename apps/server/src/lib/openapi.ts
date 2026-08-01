import { describeRoute as baseDescribeRoute, type DescribeRouteOptions } from "hono-openapi";

/**
 * The role an operation requires, rendered by Scalar as a chip. `Public` covers
 * everything the role ladder doesn't gate — including endpoints that still need
 * a signed-in user, since whether credentials are required is reported by
 * Scalar's lock rather than by this badge.
 *
 * Colours mirror `ROLE_DETAILS` in the web app's RoleBadge, so a role wears the
 * same colour in the docs as in the dashboard. `Public` is left uncoloured and
 * takes Scalar's default chip.
 */
export const API_ROLES = {
    Public: { name: "Public" },
    Verified: { name: "Verified", color: "#22c55e" }, // green
    Reviewer: { name: "Reviewer", color: "#a855f7" }, // purple
    Manager: { name: "Manager", color: "#3b82f6" }, // blue
    Admin: { name: "Admin", color: "#eab308" }, // yellow
    Superadmin: { name: "Superadmin", color: "#ef4444" }, // red
} as const;

export type ApiRole = keyof typeof API_ROLES;

/**
 * `describeRoute` with a required `role`.
 *
 * Wrapping is what makes the badge possible: hono-openapi types the spec against
 * OpenAPI's `OperationObject`, which has no slot for `x-` extensions, so
 * `x-badges` is a compile error at a call site. The cast lives here instead of
 * seventy-odd times over.
 */
export function describeRoute({ role, ...spec }: DescribeRouteOptions & { role: ApiRole }) {
    return baseDescribeRoute({
        ...spec,
        ...({ "x-badges": [API_ROLES[role]] } as Partial<DescribeRouteOptions>),
    });
}
