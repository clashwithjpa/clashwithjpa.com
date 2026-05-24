import { isAdmin, isManager, isReviewer } from "@/lib/auth/functions";
import { getDbErrorMessage } from "@/lib/db/error";
import {
    assignCwlApplication,
    createClan,
    createCwlClan,
    deleteClan,
    deleteCwlClan,
    getAllClans,
    getAllCwlApplications,
    getAllCwlClans,
    getClanApplications,
    getCocAccountsForUser,
    getDiscordAccountId,
    getSettings,
    updateClan,
    updateClanApplicationStatus,
    updateCwlClan,
    updateSettings,
} from "@/lib/db/functions";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
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
            return c.json({ success: true, data: { application } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update application" }, 500);
        }
    },
);

// ============================================================
// CWL applications - reviewer perm
// ============================================================

const cwlApplicationSchema = z4.object({
    id: z4.number(),
    discordUserId: z4.string(),
    discordUsername: z4.string(),
    cocAccountName: z4.string(),
    cocAccountTag: z4.string(),
    cocAccountClan: z4.string(),
    cocAccountWeight: z4.number(),
    isAlt: z4.boolean(),
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
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getCwlApplications",
        description: "[Reviewer] Lists CWL applications. Filter by month/year/assignedTo or unassigned=true.",
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
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "assignCwlApplication",
        description: "[Reviewer] Assigns (or unassigns when clanTag is null) a CWL application to a CWL clan.",
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
            const settings = await updateSettings(c.req.valid("json"));
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
            const clan = await updateClan(id, c.req.valid("json"));
            if (!clan) return c.json({ success: false, error: "Clan not found" }, 404);
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
    email: z4.string(),
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
            const tag = decodeURIComponent(c.req.param("tag"));
            const clan = await updateCwlClan(tag, c.req.valid("json"));
            if (!clan) return c.json({ success: false, error: "CWL clan not found" }, 404);
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
            const tag = decodeURIComponent(c.req.param("tag"));
            const clan = await deleteCwlClan(tag);
            if (!clan) return c.json({ success: false, error: "CWL clan not found" }, 404);
            return c.json({ success: true, data: { clan } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to delete CWL clan" }, 500);
        }
    },
);

export default app;
