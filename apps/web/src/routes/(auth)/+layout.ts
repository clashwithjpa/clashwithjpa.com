import { authClient, hasPermission } from "$lib/auth";
import { statement } from "@repo/auth-shared";
import { redirect } from "@sveltejs/kit";
import type { Component } from "svelte";
import type { LayoutLoad } from "./$types";

import TablerBook2 from "~icons/tabler/book-2";
import TablerFileDescription from "~icons/tabler/file-description";
import TablerHistory from "~icons/tabler/history";
import TablerHome from "~icons/tabler/home";
import TablerLogout2 from "~icons/tabler/logout-2";
import TablerScale from "~icons/tabler/scale";
import TablerSettings from "~icons/tabler/settings";
import TablerShield from "~icons/tabler/shield";
import TablerSwords from "~icons/tabler/swords";
import TablerUser from "~icons/tabler/user";

export interface NavigationLink {
    name: string;
    icon: Component;
    href: string;
    description?: string;
    requiredPerm?: (typeof statement.jpa)[number];
}

export const load: LayoutLoad = async ({ url }) => {
    const session = await authClient.getSession();
    const user = session.data?.user;

    if (!user) {
        const signInResult = await authClient.signIn.social({ provider: "discord", callbackURL: url.href });
        const target = signInResult.data?.url ?? "/";
        throw redirect(303, target);
    }

    const permsToCheck = statement.jpa;
    const permissionsEntries = await Promise.all(permsToCheck.map(async (perm) => [perm, await hasPermission(user.id, perm)] as const));
    const permissions = Object.fromEntries(permissionsEntries) as Record<string, boolean>;

    const dashboardLinks: NavigationLink[] = [
        { name: "Home ", icon: TablerHome, href: "/dashboard" },
        { name: "Apply", icon: TablerFileDescription, href: "/dashboard/apply", requiredPerm: "apply" },
        { name: "CWL", icon: TablerSwords, href: "/dashboard/cwl", requiredPerm: "cwl" },
        { name: "Settings", icon: TablerSettings, href: "/dashboard/settings" },
        { name: "Leave", icon: TablerLogout2, href: "/" },
    ];

    const adminLinks: NavigationLink[] = [
        { name: "Home", icon: TablerHome, href: "/admin" },
        {
            name: "CWL",
            icon: TablerSwords,
            href: "/admin/cwl-applications",
            description: "Manage CWL applications and assignments",
            requiredPerm: "manage",
        },
        {
            name: "CWL Clans",
            icon: TablerShield,
            href: "/admin/cwl-clans",
            description: "Add or remove clans for CWL assignments",
            requiredPerm: "sudo",
        },
        {
            name: "Applications",
            icon: TablerFileDescription,
            href: "/admin/join-applications",
            description: "Review pending clan join applications",
            requiredPerm: "review",
        },
        {
            name: "Users",
            icon: TablerUser,
            href: "/admin/users",
            description: "Manage users, roles and sessions",
            requiredPerm: "manage",
        },
        {
            name: "COC Accounts",
            icon: TablerScale,
            href: "/admin/coc-accounts",
            description: "View linked accounts and edit war weights",
            requiredPerm: "manage",
        },
        {
            name: "Rules",
            icon: TablerBook2,
            href: "/admin/rules",
            description: "Edit alliance rules",
            requiredPerm: "manage",
        },
        {
            name: "Audit Log",
            icon: TablerHistory,
            href: "/admin/audit-log",
            description: "View server actions history",
            requiredPerm: "manage",
        },
        {
            name: "Settings",
            icon: TablerSettings,
            href: "/admin/settings",
            description: "Site-wide toggles and configuration",
            requiredPerm: "sudo",
        },
        { name: "Leave", icon: TablerLogout2, href: "/" },
    ];

    return { permissions, dashboardLinks, adminLinks };
};
