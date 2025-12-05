import { env } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import type { UserData } from "$lib/auth/user";
import { checkGuild, checkRole, checkUser } from "$lib/discord/check";
import { getAdminConfig } from "$lib/server/functions";
import { settingsTable } from "$lib/server/schema";
import { json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

const isAdmin = (user: UserData | null) => user && user.isAdmin;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleAddAdminRole = async (locals: App.Locals, value: any, adminConfig: any) => {
    const roleData = await checkRole(publicEnv.PUBLIC_DISCORD_URL, env.DISCORD_BOT_TOKEN, locals.db, value);
    if ("error" in roleData) {
        return { error: "Invalid Role ID", status: 400 };
    }
    const newAdminRolesId = adminConfig.adminRolesId.concat(value);
    await locals.db.update(settingsTable).set({ value: newAdminRolesId }).where(eq(settingsTable.key, "admin_roles_id"));
    return roleData;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleAddAdminMember = async (locals: App.Locals, value: any, adminConfig: any) => {
    const userData = await checkUser(publicEnv.PUBLIC_DISCORD_URL, env.DISCORD_BOT_TOKEN, value);
    if ("error" in userData) {
        return { error: "Invalid User ID", status: 400 };
    }
    const newAdminMembersId = adminConfig.adminMembersId.concat(value);
    await locals.db.update(settingsTable).set({ value: newAdminMembersId }).where(eq(settingsTable.key, "admin_members_id"));
    return userData;
};

const handleApplication = async (locals: App.Locals, value: boolean) => {
    await locals.db.update(settingsTable).set({ value: value }).where(eq(settingsTable.key, "applications_enabled"));
    return { success: true };
};

const handleCWL = async (locals: App.Locals, value: boolean) => {
    await locals.db.update(settingsTable).set({ value: value }).where(eq(settingsTable.key, "cwl_enabled"));
    return { success: true };
};

export const POST: RequestHandler = async ({ locals, request }) => {
    const user = locals.user;
    const body = await request.json();
    const adminConfig = await getAdminConfig(locals.db);

    if (!isAdmin(user)) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = body;

    if (key === "guild_id") {
        const guildData = await checkGuild(publicEnv.PUBLIC_DISCORD_URL, env.DISCORD_BOT_TOKEN, value.id);
        if ("error" in guildData) {
            return json({ error: "Invalid Guild ID" }, { status: 400 });
        }
        await locals.db.update(settingsTable).set({ value: value }).where(eq(settingsTable.key, key));
        return json(guildData);
    }

    if (key === "add_admin_role_id") {
        const result = await handleAddAdminRole(locals, value, adminConfig);
        if ("error" in result) {
            return json({ error: result.error }, { status: result.status });
        }
        return json(result);
    }

    if (key === "add_admin_id") {
        const result = await handleAddAdminMember(locals, value, adminConfig);
        if ("error" in result) {
            return json({ error: result.error }, { status: result.status });
        }
        return json(result);
    }

    if (key === "applications_enabled") {
        const enabled: boolean = value;
        return json(await handleApplication(locals, enabled));
    }

    if (key === "cwl_enabled") {
        const enabled: boolean = value;
        return json(await handleCWL(locals, enabled));
    }

    await locals.db.update(settingsTable).set({ value: value }).where(eq(settingsTable.key, key));
    return json({ success: true });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
    const user = locals.user;
    const body = await request.json();
    const adminConfig = await getAdminConfig(locals.db);

    if (!isAdmin(user)) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = body;

    if (key === "remove_admin_role_id") {
        const newAdminRolesId = adminConfig.adminRolesId.filter((id: string) => id !== value);
        await locals.db.update(settingsTable).set({ value: newAdminRolesId }).where(eq(settingsTable.key, "admin_roles_id"));
        return json({ success: true });
    }

    if (key === "remove_admin_id") {
        const newAdminMembersId = adminConfig.adminMembersId.filter((id: string) => id !== value);
        await locals.db.update(settingsTable).set({ value: newAdminMembersId }).where(eq(settingsTable.key, "admin_members_id"));
        return json({ success: true });
    }

    return json({ error: "Invalid key" }, { status: 400 });
};
