import { PUBLIC_SERVER_URL } from "$env/static/public";
import { authClient, hasPermission } from "$lib/auth";
import { statement } from "@repo/auth-shared";
import { getUserFeatures } from "@repo/clashofclans-client";
import { redirect } from "@sveltejs/kit";
import type { Component } from "svelte";
import type { LayoutLoad } from "./$types";

import TablerAward from "~icons/tabler/award";
import TablerBook2 from "~icons/tabler/book-2";
import TablerFileDescription from "~icons/tabler/file-description";
import TablerFlag from "~icons/tabler/flag";
import TablerHistory from "~icons/tabler/history";
import TablerHome from "~icons/tabler/home";
import TablerLogout2 from "~icons/tabler/logout-2";
import TablerScale from "~icons/tabler/scale";
import TablerSettings from "~icons/tabler/settings";
import TablerShield from "~icons/tabler/shield";
import TablerSwords from "~icons/tabler/swords";
import TablerUser from "~icons/tabler/user";

export type FeatureFlag = "applicationsEnabled" | "cwlEnabled";

export interface NavigationLink {
    name: string;
    icon: Component;
    href: string;
    category?: string;
    description?: string;
    requiredPerm?: (typeof statement.jpa)[number];
    requiredFeature?: FeatureFlag;
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

    const features: Record<FeatureFlag, boolean> = { applicationsEnabled: false, cwlEnabled: false };
    try {
        const resp = await getUserFeatures({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
        if (resp.success) {
            features.applicationsEnabled = resp.data.applicationsEnabled;
            features.cwlEnabled = resp.data.cwlEnabled;
        }
    } catch {
        // leave features disabled on failure
    }

    const dashboardLinks: NavigationLink[] = [
        { name: "Home", icon: TablerHome, href: "/dashboard", category: "General" },
        {
            name: "Apply",
            icon: TablerFileDescription,
            href: "/dashboard/apply",
            category: "General",
            requiredPerm: "apply",
            requiredFeature: "applicationsEnabled",
        },
        { name: "CWL", icon: TablerSwords, href: "/dashboard/cwl", category: "General", requiredPerm: "cwl", requiredFeature: "cwlEnabled" },
        { name: "Settings", icon: TablerSettings, href: "/dashboard/settings", category: "Account" },
        { name: "Leave", icon: TablerLogout2, href: "/", category: "Exit" },
    ];

    const adminLinks: NavigationLink[] = [
        { name: "Home", icon: TablerHome, href: "/admin", category: "Overview" },
        {
            name: "CWL",
            icon: TablerSwords,
            href: "/admin/cwl-applications",
            category: "CWL",
            description: "Manage CWL applications and assignments",
            requiredPerm: "manage",
        },
        {
            name: "CWL Clans",
            icon: TablerShield,
            href: "/admin/cwl-clans",
            category: "CWL",
            description: "Add or remove clans for CWL assignments",
            requiredPerm: "sudo",
        },
        {
            name: "Bonus",
            icon: TablerAward,
            href: "/admin/bonus",
            category: "CWL",
            description: "Assign CWL bonuses and review account stats",
            requiredPerm: "manage",
        },
        {
            name: "Applications",
            icon: TablerFileDescription,
            href: "/admin/join-applications",
            category: "Members",
            description: "Review pending clan join applications",
            requiredPerm: "review",
        },
        {
            name: "Users",
            icon: TablerUser,
            href: "/admin/users",
            category: "Members",
            description: "Manage users, roles and sessions",
            requiredPerm: "manage",
        },
        {
            name: "COC Accounts",
            icon: TablerScale,
            href: "/admin/coc-accounts",
            category: "Members",
            description: "View linked accounts and edit war weights",
            requiredPerm: "manage",
        },
        {
            name: "Clans",
            icon: TablerFlag,
            href: "/admin/clans",
            category: "Members",
            description: "Manage JPA clans, Discord links and requirements",
            requiredPerm: "sudo",
        },
        {
            name: "Rules",
            icon: TablerBook2,
            href: "/admin/rules",
            category: "System",
            description: "Edit alliance rules",
            requiredPerm: "manage",
        },
        {
            name: "Audit Log",
            icon: TablerHistory,
            href: "/admin/audit-log",
            category: "System",
            description: "View server actions history",
            requiredPerm: "manage",
        },
        {
            name: "Settings",
            icon: TablerSettings,
            href: "/admin/settings",
            category: "System",
            description: "Site-wide toggles and configuration",
            requiredPerm: "sudo",
        },
        { name: "Leave", icon: TablerLogout2, href: "/", category: "Exit" },
    ];

    return { permissions, features, dashboardLinks, adminLinks };
};
