import { authClient } from "$lib/auth";
import type { Role } from "$lib/config/roles";
import { error } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

const ADMIN_ROLES: Role[] = ["admin", "manager", "reviewer"];

export const load: LayoutLoad = async () => {
    const session = await authClient.getSession();
    const userRole = session.data?.user?.role as Role | undefined;
    const isAdmin = !!userRole && ADMIN_ROLES.includes(userRole);

    if (!session.data?.user || !isAdmin) {
        throw error(401, "Unauthorized");
    }

    return { session };
};
