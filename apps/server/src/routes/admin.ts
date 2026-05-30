import { isAdmin, isManager, isReviewer } from "@/lib/auth/functions";
import { logAction } from "@/lib/audit";
import { getDbErrorMessage } from "@/lib/db/error";
import {
    assignCwlApplication,
    createClan,
    createCwlClan,
    deleteClan,
    deleteCwlClan,
    getAllClans,
    getAllCocAccounts,
    getAllCwlApplications,
    getAllCwlClans,
    getAuditLog,
    getClanApplications,
    getCocAccountsForUser,
    getDiscordAccountId,
    getSettings,
    MissingDiscordAccountError,
    updateClan,
    updateClanApplicationStatus,
    updateCocAccountExternal,
    updateCocAccountWarWeight,
    updateCwlClan,
    updateSettings,
} from "@/lib/db/functions";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
import { invalidateSettingsCache } from "@/lib/settings-cache";
import { ErrorResponseSchema, SuccessResponseSchema, type AppEnv } from "@/lib/types";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import z4 from "zod/v4";

// All routes have /admin as a prefix
// Each route specifies its own permission-level middleware (review/manage/sudo)
const app = new Hono<AppEnv>();

const getDiscordIdPathSchema = z4.object({
    userid: z4.string().min(1, "userid is required"),
});
const getDiscordIdData = z4.object({
    accountId: z4.string(),
});
app.get(
    "/discord-id/:userid",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getDiscordIdByUserId",
        description: "[Manager] Fetches the Discord accountId from Better Auth account table using a userid path param.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Successful response with the Discord accountId.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(getDiscordIdData)) } },
            },
            400: { description: "Bad request.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", getDiscordIdPathSchema),
    async (c) => {
        const userId = c.req.param("userid");

        try {
            const accountId = await getDiscordAccountId(userId);

            if (!accountId) {
                return c.json({ success: false, error: "No Discord account found for this userId" }, 404);
            }

            return c.json({
                success: true,
                data: { accountId },
            });
        } catch {
            return c.json({ success: false, error: "Failed to fetch Discord accountId" }, 500);
        }
    },
);

// ============================================================
// User COC accounts (for admin user sidebar - manage perm)
// ============================================================

const getUserCocAccountsPathSchema = z4.object({
    userid: z4.string().min(1, "userid is required"),
});
const getUserCocAccountsData = z4.object({
    accounts: z4.array(
        z4.object({
            id: z4.number(),
            discordUserId: z4.string(),
            cocAccountTag: z4.string(),
            warWeight: z4.number(),
        }),
    ),
});
app.get(
    "/users/:userid/coc-accounts",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getUserCocAccountsByUserId",
        description: "[Manager] Fetches the linked Clash of Clans accounts for a user by Better Auth userId.",
        tags: ["admin"],
        responses: {
            200: {
                description: "User's COC accounts.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(getUserCocAccountsData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", getUserCocAccountsPathSchema),
    async (c) => {
        try {
            const accounts = await getCocAccountsForUser(c.req.param("userid"));
            return c.json({ success: true, data: { accounts } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch user's COC accounts" }, 500);
        }
    },
);

// ============================================================
// Join applications (clan applications) - reviewer perm
// ============================================================

const clanApplicationSchema = z4.object({
    id: z4.number(),
    cocAccountTag: z4.string(),
    cocAccountData: z4.unknown(),
    discordUserId: z4.string(),
    status: z4.enum(["pending", "accepted", "rejected"]),
    createdAt: z4.date(),
});

const getJoinApplicationsQuerySchema = z4.object({
    status: z4.enum(["pending", "accepted", "rejected"]).optional(),
    limit: z4.coerce.number().int().min(1).max(200).default(50),
    offset: z4.coerce.number().int().min(0).default(0),
});
const getJoinApplicationsData = z4.object({
    applications: z4.array(clanApplicationSchema),
    total: z4.number(),
});
app.get(
    "/join-applications",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getJoinApplications",
        description: "[Reviewer] Lists clan join applications with optional status filter and pagination.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Applications.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(getJoinApplicationsData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("query", getJoinApplicationsQuerySchema),
    async (c) => {
        try {
            const { status, limit, offset } = c.req.valid("query");
            const result = await getClanApplications({ status, limit, offset });
            return c.json({ success: true, data: result });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch join applications" }, 500);
        }
    },
);

const updateJoinApplicationPathSchema = z4.object({
    id: z4.coerce.number().int().min(1),
});
const updateJoinApplicationBodySchema = z4.object({
    status: z4.enum(["pending", "accepted", "rejected"]),
});
const updateJoinApplicationData = z4.object({
    application: clanApplicationSchema,
});
app.put(
    "/join-applications/:id",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "updateJoinApplicationStatus",
        description: "[Reviewer] Updates the status of a clan join application (accept/reject/pending).",
        tags: ["admin"],
        responses: {
            200: {
                description: "Updated application.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(updateJoinApplicationData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", updateJoinApplicationPathSchema),
    zValidator("json", updateJoinApplicationBodySchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const { status } = c.req.valid("json");
            const application = await updateClanApplicationStatus(id, status);
            if (!application) return c.json({ success: false, error: "Application not found" }, 404);
            logAction(c, {
                action: `clan_application.${status}` as const,
                targetType: "clan_application",
                targetId: application.id,
                metadata: { cocAccountTag: application.cocAccountTag },
            });
            return c.json({ success: true, data: { application } });
        } catch (error) {
            if (error instanceof MissingDiscordAccountError) {
                return c.json({ success: false, error: "Applicant's Discord account is no longer linked. They must re-link before approval." }, 400);
            }
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update application" }, 500);
        }
    },
);

// ============================================================
// CWL applications - manager perm
// ============================================================

const cwlApplicationSchema = z4.object({
    id: z4.number(),
    discordUserId: z4.string(),
    discordUsername: z4.string(),
    cocAccountName: z4.string(),
    cocAccountTag: z4.string(),
    cocAccountClan: z4.string().nullable(),
    cocAccountWeight: z4.number(),
    isExternal: z4.boolean(),
    month: z4.string(),
    year: z4.number(),
    preferenceNum: z4.number(),
    appliedAt: z4.date(),
    assignedTo: z4.string().nullable(),
});

const getCwlApplicationsQuerySchema = z4.object({
    month: z4.string().optional(),
    year: z4.coerce.number().int().optional(),
    assignedTo: z4.string().optional(),
    unassigned: z4.coerce.boolean().optional(),
    limit: z4.coerce.number().int().min(1).max(200).default(50),
    offset: z4.coerce.number().int().min(0).default(0),
});
const getCwlApplicationsData = z4.object({
    applications: z4.array(cwlApplicationSchema),
    total: z4.number(),
});
app.get(
    "/cwl-applications",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getCwlApplications",
        description: "[Manager] Lists CWL applications. Filter by month/year/assignedTo or unassigned=true.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Applications.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(getCwlApplicationsData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("query", getCwlApplicationsQuerySchema),
    async (c) => {
        try {
            const { month, year, assignedTo, unassigned, limit, offset } = c.req.valid("query");
            const result = await getAllCwlApplications({
                month,
                year,
                assignedTo: unassigned ? null : assignedTo,
                limit,
                offset,
            });
            return c.json({ success: true, data: result });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL applications" }, 500);
        }
    },
);

const assignCwlApplicationPathSchema = z4.object({
    id: z4.coerce.number().int().min(1),
});
const assignCwlApplicationBodySchema = z4.object({
    clanTag: z4.string().nullable(),
});
const assignCwlApplicationData = z4.object({
    application: cwlApplicationSchema,
});
app.put(
    "/cwl-applications/:id/assign",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "assignCwlApplication",
        description: "[Manager] Assigns (or unassigns when clanTag is null) a CWL application to a CWL clan.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Updated application.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(assignCwlApplicationData)) } },
            },
            400: { description: "Bad request.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", assignCwlApplicationPathSchema),
    zValidator("json", assignCwlApplicationBodySchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const { clanTag } = c.req.valid("json");
            const application = await assignCwlApplication(id, clanTag);
            if (!application) return c.json({ success: false, error: "Application not found" }, 404);
            logAction(c, {
                action: clanTag ? "cwl_application.assign" : "cwl_application.unassign",
                targetType: "cwl_application",
                targetId: application.id,
                metadata: clanTag
                    ? { cocAccountTag: application.cocAccountTag, assignedClanTag: clanTag }
                    : { cocAccountTag: application.cocAccountTag },
            });
            return c.json({ success: true, data: { application } });
        } catch (error: any) {
            const { code } = getDbErrorMessage(error);
            if (code === "23503") return c.json({ success: false, error: "CWL clan with this tag does not exist." }, 400);
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to assign CWL application" }, 500);
        }
    },
);

// ============================================================
// Settings - manage for read + toggles, sudo for siteMaintenance/guildId/clan CRUD
// ============================================================

const settingsSchema = z4.object({
    id: z4.number(),
    applicationsEnabled: z4.boolean(),
    cwlEnabled: z4.boolean(),
    siteMaintenanceMode: z4.boolean(),
    rulesContent: z4.string().nullable(),
    guildId: z4.string().nullable(),
    updatedAt: z4.date().nullable(),
});

const getSettingsData = z4.object({
    settings: settingsSchema.nullable(),
});
app.get(
    "/settings",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "getAdminSettings",
        description: "[Admin/sudo] Fetches the current site settings.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Settings.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(getSettingsData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    async (c) => {
        try {
            c.header("Cache-Control", "no-cache, no-store, must-revalidate");
            const settings = await getSettings();
            return c.json({ success: true, data: { settings } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch settings" }, 500);
        }
    },
);

const updateSettingsBodySchema = z4.object({
    applicationsEnabled: z4.boolean().optional(),
    cwlEnabled: z4.boolean().optional(),
    siteMaintenanceMode: z4.boolean().optional(),
    guildId: z4.string().nullable().optional(),
});
const updateSettingsData = z4.object({
    settings: settingsSchema,
});
app.put(
    "/settings",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "updateAdminSettings",
        description: "[Admin/sudo] Updates site settings.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Updated settings.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(updateSettingsData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", updateSettingsBodySchema),
    async (c) => {
        try {
            const body = c.req.valid("json");
            const settings = await updateSettings(body);
            await invalidateSettingsCache();

            const booleans: Record<string, boolean> = {};
            const fields: string[] = [];
            for (const [key, value] of Object.entries(body)) {
                if (value === undefined) continue;
                if (typeof value === "boolean") booleans[key] = value;
                else fields.push(key);
            }
            const metadata: Record<string, unknown> = {};
            if (Object.keys(booleans).length) metadata.booleans = booleans;
            if (fields.length) metadata.fields = fields;
            logAction(c, {
                action: "settings.update",
                targetType: "settings",
                targetId: settings.id,
                metadata: Object.keys(metadata).length ? metadata : undefined,
            });

            return c.json({ success: true, data: { settings } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update settings" }, 500);
        }
    },
);

// ============================================================
// JPA Clans CRUD - manage read, sudo write
// ============================================================

const clanInfoSchema = z4.object({
    id: z4.number(),
    cocClanCode: z4.string(),
    cocClanName: z4.string().nullable(),
    cocClanLevel: z4.number().nullable(),
    cocClanTag: z4.string(),
    discordClanRoleId: z4.string(),
    discordClanChannelId: z4.string(),
    discordMemberRoleId: z4.string(),
    discordElderRoleId: z4.string(),
    discordColeaderRoleId: z4.string(),
    discordLeaderRoleId: z4.string(),
    discordLeaderId: z4.string(),
    attacksRequirement: z4.number(),
    donationsRequirement: z4.number(),
    clangamesRequirement: z4.number(),
});

const getAdminClansData = z4.object({
    clans: z4.array(clanInfoSchema),
});
app.get(
    "/clans",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getAdminClans",
        description: "[Manager] Lists all JPA clans with full details.",
        tags: ["admin"],
        responses: {
            200: { description: "Clans.", content: { "application/json": { schema: resolver(SuccessResponseSchema(getAdminClansData)) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    async (c) => {
        try {
            const clans = await getAllClans();
            return c.json({ success: true, data: { clans } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch clans" }, 500);
        }
    },
);

const clanInputSchema = z4.object({
    cocClanCode: z4.string().min(1),
    cocClanName: z4.string().nullable().optional(),
    cocClanLevel: z4.number().int().nullable().optional(),
    cocClanTag: z4.string().min(1).startsWith("#"),
    discordClanRoleId: z4.string().min(1),
    discordClanChannelId: z4.string().min(1),
    discordMemberRoleId: z4.string().min(1),
    discordElderRoleId: z4.string().min(1),
    discordColeaderRoleId: z4.string().min(1),
    discordLeaderRoleId: z4.string().min(1),
    discordLeaderId: z4.string().min(1),
    attacksRequirement: z4.number().int().min(0),
    donationsRequirement: z4.number().int().min(0),
    clangamesRequirement: z4.number().int().min(0),
});
const upsertClanData = z4.object({
    clan: clanInfoSchema,
});
app.post(
    "/clans",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "createAdminClan",
        description: "[Admin/sudo] Creates a new JPA clan.",
        tags: ["admin"],
        responses: {
            200: { description: "Created clan.", content: { "application/json": { schema: resolver(SuccessResponseSchema(upsertClanData)) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            409: { description: "Duplicate.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", clanInputSchema),
    async (c) => {
        try {
            const clan = await createClan(c.req.valid("json"));
            logAction(c, {
                action: "clan.create",
                targetType: "clan",
                targetId: clan.id,
                metadata: { cocClanCode: clan.cocClanCode, cocClanTag: clan.cocClanTag },
            });
            return c.json({ success: true, data: { clan } });
        } catch (error: any) {
            const { code } = getDbErrorMessage(error);
            if (code === "23505") return c.json({ success: false, error: "A clan with this code or tag already exists." }, 409);
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to create clan" }, 500);
        }
    },
);

const clanIdPathSchema = z4.object({ id: z4.coerce.number().int().min(1) });
app.put(
    "/clans/:id",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "updateAdminClan",
        description: "[Admin/sudo] Updates a JPA clan.",
        tags: ["admin"],
        responses: {
            200: { description: "Updated clan.", content: { "application/json": { schema: resolver(SuccessResponseSchema(upsertClanData)) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", clanIdPathSchema),
    zValidator("json", clanInputSchema.partial()),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const body = c.req.valid("json");
            const clan = await updateClan(id, body);
            if (!clan) return c.json({ success: false, error: "Clan not found" }, 404);
            const fields = Object.keys(body).filter((k) => (body as Record<string, unknown>)[k] !== undefined);
            logAction(c, {
                action: "clan.update",
                targetType: "clan",
                targetId: clan.id,
                metadata: { cocClanCode: clan.cocClanCode, ...(fields.length ? { fields } : {}) },
            });
            return c.json({ success: true, data: { clan } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update clan" }, 500);
        }
    },
);

app.delete(
    "/clans/:id",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "deleteAdminClan",
        description: "[Admin/sudo] Deletes a JPA clan.",
        tags: ["admin"],
        responses: {
            200: { description: "Deleted clan.", content: { "application/json": { schema: resolver(SuccessResponseSchema(upsertClanData)) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", clanIdPathSchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const clan = await deleteClan(id);
            if (!clan) return c.json({ success: false, error: "Clan not found" }, 404);
            logAction(c, {
                action: "clan.delete",
                targetType: "clan",
                targetId: clan.id,
                metadata: { cocClanCode: clan.cocClanCode, cocClanTag: clan.cocClanTag },
            });
            return c.json({ success: true, data: { clan } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to delete clan" }, 500);
        }
    },
);

// ============================================================
// CWL Clans CRUD - manage read, sudo write
// ============================================================

const cwlClanSchema = z4.object({
    cocClanTag: z4.string(),
    cocClanName: z4.string(),
    cocClanLeague: z4.string(),
    cocClanLeader: z4.string(),
    email: z4.email(),
});

const getAdminCwlClansData = z4.object({
    clans: z4.array(cwlClanSchema),
});
app.get(
    "/cwl-clans",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getAdminCwlClans",
        description: "[Manager] Lists all CWL clans.",
        tags: ["admin"],
        responses: {
            200: { description: "Clans.", content: { "application/json": { schema: resolver(SuccessResponseSchema(getAdminCwlClansData)) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    async (c) => {
        try {
            const clans = await getAllCwlClans();
            return c.json({ success: true, data: { clans } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL clans" }, 500);
        }
    },
);

const cwlClanInputSchema = z4.object({
    cocClanTag: z4.string().min(1).startsWith("#"),
    cocClanName: z4.string().min(1),
    cocClanLeague: z4.string().min(1),
    cocClanLeader: z4.string().min(1),
    email: z4.email(),
});
const upsertCwlClanData = z4.object({
    clan: cwlClanSchema,
});
app.post(
    "/cwl-clans",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "createAdminCwlClan",
        description: "[Admin/sudo] Creates a new CWL clan.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Created CWL clan.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(upsertCwlClanData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            409: { description: "Duplicate.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", cwlClanInputSchema),
    async (c) => {
        try {
            const clan = await createCwlClan(c.req.valid("json"));
            logAction(c, {
                action: "cwl_clan.create",
                targetType: "cwl_clan",
                targetId: clan.cocClanTag,
                metadata: { cocClanTag: clan.cocClanTag, cocClanName: clan.cocClanName },
            });
            return c.json({ success: true, data: { clan } });
        } catch (error: any) {
            const { code } = getDbErrorMessage(error);
            if (code === "23505") return c.json({ success: false, error: "A CWL clan with this tag already exists." }, 409);
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to create CWL clan" }, 500);
        }
    },
);

const cwlClanPathSchema = z4.object({ tag: z4.string().min(1) });
app.put(
    "/cwl-clans/:tag",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "updateAdminCwlClan",
        description: "[Admin/sudo] Updates a CWL clan identified by URL-encoded clan tag.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Updated CWL clan.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(upsertCwlClanData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", cwlClanPathSchema),
    zValidator("json", cwlClanInputSchema.partial()),
    async (c) => {
        try {
            const { tag } = c.req.valid("param");
            const body = c.req.valid("json");
            const clan = await updateCwlClan(tag, body);
            if (!clan) return c.json({ success: false, error: "CWL clan not found" }, 404);
            const fields = Object.keys(body).filter((k) => (body as Record<string, unknown>)[k] !== undefined);
            logAction(c, {
                action: "cwl_clan.update",
                targetType: "cwl_clan",
                targetId: clan.cocClanTag,
                metadata: { cocClanTag: clan.cocClanTag, ...(fields.length ? { fields } : {}) },
            });
            return c.json({ success: true, data: { clan } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update CWL clan" }, 500);
        }
    },
);

app.delete(
    "/cwl-clans/:tag",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "deleteAdminCwlClan",
        description: "[Admin/sudo] Deletes a CWL clan identified by URL-encoded clan tag.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Deleted CWL clan.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(upsertCwlClanData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", cwlClanPathSchema),
    async (c) => {
        try {
            const { tag } = c.req.valid("param");
            const clan = await deleteCwlClan(tag);
            if (!clan) return c.json({ success: false, error: "CWL clan not found" }, 404);
            logAction(c, {
                action: "cwl_clan.delete",
                targetType: "cwl_clan",
                targetId: clan.cocClanTag,
                metadata: { cocClanTag: clan.cocClanTag, cocClanName: clan.cocClanName },
            });
            return c.json({ success: true, data: { clan } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to delete CWL clan" }, 500);
        }
    },
);

// ============================================================
// Audit log - manager+
// ============================================================

const auditLogEntrySchema = z4.object({
    id: z4.number(),
    actorId: z4.string().nullable(),
    actorName: z4.string().nullable(),
    actorCurrentName: z4.string().nullable(),
    action: z4.string(),
    targetType: z4.string().nullable(),
    targetId: z4.string().nullable(),
    metadata: z4.unknown().nullable(),
    createdAt: z4.date(),
});

const getAuditLogQuerySchema = z4.object({
    actorId: z4.string().optional(),
    action: z4.string().optional(),
    targetType: z4.string().optional(),
    targetId: z4.string().optional(),
    before: z4.coerce.date().optional(),
    after: z4.coerce.date().optional(),
    limit: z4.coerce.number().int().min(1).max(200).default(50),
    offset: z4.coerce.number().int().min(0).default(0),
});
const getAuditLogData = z4.object({
    entries: z4.array(auditLogEntrySchema),
    total: z4.number(),
});
app.get(
    "/audit-log",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getAuditLog",
        description: "[Manager] Lists audit log entries with optional filters (actorId, action, targetType, targetId, date range) and pagination.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Audit log entries.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(getAuditLogData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("query", getAuditLogQuerySchema),
    async (c) => {
        try {
            const result = await getAuditLog(c.req.valid("query"));
            return c.json({ success: true, data: result });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch audit log" }, 500);
        }
    },
);

// ============================================================
// COC accounts war weight - manager+
// ============================================================

const cocAccountSchema = z4.object({
    id: z4.number(),
    discordUserId: z4.string(),
    cocAccountTag: z4.string(),
    warWeight: z4.number(),
    isExternal: z4.boolean(),
    ownerUserId: z4.string().nullable(),
    ownerName: z4.string().nullable(),
});

const getCocAccountsQuerySchema = z4.object({
    search: z4.string().optional(),
    limit: z4.coerce.number().int().min(1).max(200).default(50),
    offset: z4.coerce.number().int().min(0).default(0),
});
const getCocAccountsData = z4.object({
    accounts: z4.array(cocAccountSchema),
    total: z4.number(),
});
app.get(
    "/coc-accounts",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getAdminCocAccounts",
        description: "[Manager] Lists all linked Clash of Clans accounts with their war weights. Search by account tag, Discord id, or owner name.",
        tags: ["admin"],
        responses: {
            200: {
                description: "COC accounts.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(getCocAccountsData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("query", getCocAccountsQuerySchema),
    async (c) => {
        try {
            const result = await getAllCocAccounts(c.req.valid("query"));
            return c.json({ success: true, data: result });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch COC accounts" }, 500);
        }
    },
);

const cocAccountIdPathSchema = z4.object({ id: z4.coerce.number().int().min(1) });
const updateCocAccountWeightBodySchema = z4.object({
    warWeight: z4.number().int().min(0),
});
const updateCocAccountWeightData = z4.object({
    account: cocAccountSchema,
});
app.put(
    "/coc-accounts/:id/weight",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "updateCocAccountWarWeight",
        description: "[Manager] Updates the war weight of a linked Clash of Clans account.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Updated COC account.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(updateCocAccountWeightData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", cocAccountIdPathSchema),
    zValidator("json", updateCocAccountWeightBodySchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const { warWeight } = c.req.valid("json");
            const account = await updateCocAccountWarWeight(id, warWeight);
            if (!account) return c.json({ success: false, error: "COC account not found" }, 404);
            logAction(c, {
                action: "coc_account.weight_update",
                targetType: "coc_account",
                targetId: account.id,
                metadata: { cocAccountTag: account.cocAccountTag, warWeight: account.warWeight },
            });
            return c.json({ success: true, data: { account } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update war weight" }, 500);
        }
    },
);

const updateCocAccountExternalBodySchema = z4.object({
    isExternal: z4.boolean(),
});
const updateCocAccountExternalData = z4.object({
    account: cocAccountSchema,
});
app.put(
    "/coc-accounts/:id/external",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "updateCocAccountExternal",
        description:
            "[Manager] Sets whether a linked Clash of Clans account is external. Toggles either way, so staff can revert a member-marked external account back to a main account.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Updated COC account.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(updateCocAccountExternalData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", cocAccountIdPathSchema),
    zValidator("json", updateCocAccountExternalBodySchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const { isExternal } = c.req.valid("json");
            const account = await updateCocAccountExternal(id, isExternal);
            if (!account) return c.json({ success: false, error: "COC account not found" }, 404);
            logAction(c, {
                action: "coc_account.external_update",
                targetType: "coc_account",
                targetId: account.id,
                metadata: { cocAccountTag: account.cocAccountTag, isExternal: account.isExternal },
            });
            return c.json({ success: true, data: { account } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update external status" }, 500);
        }
    },
);

export default app;
