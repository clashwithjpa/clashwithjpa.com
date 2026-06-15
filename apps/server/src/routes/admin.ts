import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, logAction } from "@/lib/audit";
import { isAdmin, isManager, isReviewer, isSuperadmin } from "@/lib/auth/functions";
import { cocClient } from "@/lib/coc";
import { getDbErrorMessage } from "@/lib/db/error";
import {
    assertClanDiscordIds,
    DiscordRateLimitError,
    DiscordUnavailableError,
    getGuildNicknames,
    getGuildUsernames,
    verifyClanDiscordIds,
} from "@/lib/discord";
import {
    addCocAccount,
    addCwlApplication,
    assignCwlApplication,
    assignCwlApplicationsBulk,
    createClan,
    createCwlClan,
    deleteAcceptedClanApplications,
    deleteClan,
    deleteClanApplication,
    deleteCocAccount,
    deleteCocAccountsBulk,
    deleteCwlApplicationsBulk,
    deleteCwlClan,
    getAdminUsers,
    getAllClans,
    getAllCocAccounts,
    getAllCwlApplications,
    getAllCwlClans,
    getAuditLog,
    getBonusData,
    getBonusLedger,
    getClanApplications,
    getCocAccountsForUser,
    getDiscordAccountId,
    getCwlSeasons,
    getUserNameById,
    getUsersWithDiscordAccounts,
    setUserDiscordUsername,
    getCwlStats,
    createCwlSeason,
    deleteCwlSeason,
    getSettings,
    MissingDiscordAccountError,
    setUserSeasonBonus,
    syncCocAccountStats,
    updateClan,
    updateClanApplicationStatus,
    updateCocAccountExternal,
    updateCocAccountStats,
    updateCocAccountWarWeight,
    updateCwlApplicationNotes,
    updateCwlClan,
    updateSettings,
} from "@/lib/db/functions";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
import { invalidateSettingsCache } from "@/lib/settings-cache";
import { ErrorResponseSchema, SuccessResponseSchema, type AppEnv } from "@/lib/types";
import { ROLES } from "@repo/auth-shared";
import * as Sentry from "@sentry/bun";
import { parse } from "csv-parse/sync";
import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import z4 from "zod/v4";

// Each route specifies its own permission-level middleware (review/manage/sudo)
const app = new Hono<AppEnv>();

// Users list with case-insensitive search (manage perm)

const listUsersQuerySchema = z4.object({
    search: z4.string().optional(),
    role: z4.string().optional(),
    limit: z4.coerce.number().int().min(1).max(200).default(50),
    offset: z4.coerce.number().int().min(0).default(0),
    sortBy: z4.string().optional(),
    sortDirection: z4.enum(["asc", "desc"]).optional(),
});
app.get(
    "/users",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getAdminUsers",
        description: "[Manager] Lists users with case-insensitive search across name and Discord id.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Users.",
                content: {
                    "application/json": {
                        schema: resolver(
                            SuccessResponseSchema(
                                z4.object({ users: z4.array(z4.unknown()), total: z4.number(), roleCounts: z4.record(z4.string(), z4.number()) }),
                            ),
                        ),
                    },
                },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("query", listUsersQuerySchema),
    async (c) => {
        try {
            const result = await getAdminUsers(c.req.valid("query"));
            return c.json({ success: true, data: result });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch users" }, 500);
        }
    },
);

// User COC accounts (for admin user sidebar - manage perm)

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
            isExternal: z4.boolean(),
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

// Join applications (clan applications) - reviewer perm

const clanApplicationSchema = z4.object({
    id: z4.number(),
    cocAccountTag: z4.string(),
    cocAccountData: z4.unknown(),
    discordUserId: z4.string(),
    status: z4.enum(["pending", "accepted", "rejected"]),
    createdAt: z4.date(),
    image: z4.string().nullable(),
    discordUsername: z4.string().nullable(),
    discordRole: z4.string().nullable(),
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

const clearAcceptedJoinApplicationsData = z4.object({ deleted: z4.number() });
app.delete(
    "/join-applications/accepted",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "clearAcceptedJoinApplications",
        description: "[Admin] Deletes all accepted clan join applications. Deletion is an admin-only (sudo) power.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Number of deleted applications.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(clearAcceptedJoinApplicationsData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    async (c) => {
        try {
            const deleted = await deleteAcceptedClanApplications();
            logAction(c, {
                action: "clan_application.clear_accepted",
                targetType: "clan_application",
                metadata: { deleted },
            });
            return c.json({ success: true, data: { deleted } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to clear accepted applications" }, 500);
        }
    },
);

const deleteJoinApplicationData = z4.object({ application: clanApplicationSchema });
app.delete(
    "/join-applications/:id",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "deleteJoinApplication",
        description: "[Admin] Permanently deletes a single clan join application. Deletion is an admin-only (sudo) power.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Deleted application.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(deleteJoinApplicationData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", updateJoinApplicationPathSchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const application = await deleteClanApplication(id);
            if (!application) return c.json({ success: false, error: "Application not found" }, 404);
            logAction(c, {
                action: "clan_application.delete",
                targetType: "clan_application",
                targetId: application.id,
                metadata: { cocAccountTag: application.cocAccountTag },
            });
            return c.json({ success: true, data: { application } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to delete application" }, 500);
        }
    },
);

// CWL applications - manager perm

const cwlApplicationSchema = z4.object({
    id: z4.number(),
    discordUserId: z4.string(),
    discordUsername: z4.string(),
    cocAccountName: z4.string(),
    cocAccountTag: z4.string(),
    cocAccountClan: z4.string().nullable(),
    cocAccountWeight: z4.number(),
    isExternal: z4.boolean(),
    image: z4.string().nullable(),
    seasonId: z4.number(),
    seasonName: z4.string().nullable(),
    month: z4.string().nullable(),
    year: z4.number().nullable(),
    preferenceNum: z4.number(),
    appliedAt: z4.date(),
    assignedTo: z4.string().nullable(),
});

const getCwlApplicationsQuerySchema = z4.object({
    seasonId: z4.coerce.number().int().optional(),
    assignedTo: z4.string().optional(),
    unassigned: z4.coerce.boolean().optional(),
    // Optional: when omitted, the whole (filtered) season is returned.
    limit: z4.coerce.number().int().min(1).optional(),
    offset: z4.coerce.number().int().min(0).optional(),
});
const cwlApplicationWithAccountSchema = cwlApplicationSchema.extend({ cocAccountId: z4.number(), ownerRole: z4.string().nullable() });
const getCwlApplicationsData = z4.object({
    applications: z4.array(cwlApplicationWithAccountSchema),
    total: z4.number(),
    seasonId: z4.number().nullable(),
});
app.get(
    "/cwl-applications",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getCwlApplications",
        description:
            "[Manager] Lists CWL applications for a season (defaults to the current season). Filter by seasonId/assignedTo or unassigned=true.",
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
            const { seasonId, assignedTo, unassigned, limit, offset } = c.req.valid("query");
            const result = await getAllCwlApplications({
                seasonId,
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

const createCwlApplicationBodySchema = z4.object({
    userId: z4.string().min(1, "userId is required"),
    tag: z4.string().min(1, "Account tag is required").max(20).startsWith("#", "Account tag must start with #"),
    preferenceNum: z4.coerce.number().int().min(1).max(99).default(1),
    seasonId: z4.coerce.number().int().min(1).optional(),
});
const createCwlApplicationData = z4.object({
    application: z4.object({
        id: z4.number(),
        cocAccountTag: z4.string(),
        cocAccountName: z4.string(),
        cocAccountClan: z4.string().nullable(),
        preferenceNum: z4.number(),
        seasonId: z4.number(),
        appliedAt: z4.date(),
        assignedTo: z4.string().nullable(),
    }),
});
app.post(
    "/cwl-applications",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "createCwlApplication",
        description:
            "[Manager] Manually registers a CWL application for a user (latecomers after signups close). The Discord account and Clash of Clans account must already be linked. Defaults to the current season.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Created application.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(createCwlApplicationData)) } },
            },
            400: { description: "Bad request.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            409: { description: "Duplicate application.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", createCwlApplicationBodySchema),
    async (c) => {
        try {
            const { userId, tag, preferenceNum, seasonId: bodySeasonId } = c.req.valid("json");

            let seasonId = bodySeasonId;
            if (seasonId === undefined) {
                const settings = await getSettings();
                seasonId = settings?.currentCwlSeasonId ?? undefined;
            }
            if (seasonId === undefined) return c.json({ success: false, error: "No active CWL season is set." }, 400);

            // Both accounts must already be linked: the CoC account has to belong to
            // the selected user (which also resolves their Discord account id).
            const accounts = await getCocAccountsForUser(userId);
            const matched = accounts.find((a) => a.cocAccountTag === tag);
            if (!matched) return c.json({ success: false, error: "This account is not linked to the selected user." }, 400);

            const discordUsername = await getUserNameById(userId);
            if (!discordUsername) return c.json({ success: false, error: "Selected user not found." }, 404);

            let playerData;
            try {
                playerData = await cocClient.getPlayer(tag);
            } catch (error) {
                Sentry.captureException(error);
                return c.json({ success: false, error: "Invalid account tag or failed to fetch player data." }, 400);
            }

            const application = await addCwlApplication({
                discordUserId: matched.discordUserId,
                discordUsername,
                cocAccountName: playerData.name,
                cocAccountTag: tag,
                // External accounts don't pick a clan; mains take their live clan.
                cocAccountClan: matched.isExternal ? null : (playerData.clan?.name ?? matched.currentClan ?? null),
                preferenceNum,
                seasonId,
            });
            logAction(c, {
                action: "cwl_application.create",
                targetType: "cwl_application",
                targetId: application.id,
                metadata: { cocAccountTag: tag, seasonId, preferenceNum, manual: true },
            });
            return c.json({ success: true, data: { application } });
        } catch (error: any) {
            const { constraint, code } = getDbErrorMessage(error);
            if (code === "23505") {
                const errorMessage =
                    constraint === "cwl_table_accountTag_season_unique"
                        ? "This account already has a CWL application this season."
                        : "This preference number is already in use for this account or user this season.";
                return c.json({ success: false, error: errorMessage }, 409);
            }
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to create CWL application" }, 500);
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

const updateCwlNotesBodySchema = z4.object({ notes: z4.string().max(500).nullable() });
const updateCwlNotesData = z4.object({ application: z4.object({ id: z4.number(), notes: z4.string().nullable() }) });
app.put(
    "/cwl-applications/:id/notes",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "updateCwlApplicationNotes",
        description: "[Manager] Updates the free-text notes/remarks on a CWL application.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Updated application.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(updateCwlNotesData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", assignCwlApplicationPathSchema),
    zValidator("json", updateCwlNotesBodySchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const { notes } = c.req.valid("json");
            const trimmed = notes?.trim() ? notes.trim() : null;
            const application = await updateCwlApplicationNotes(id, trimmed);
            if (!application) return c.json({ success: false, error: "Application not found" }, 404);
            logAction(c, { action: "cwl_application.update_notes", targetType: "cwl_application", targetId: id, metadata: {} });
            return c.json({ success: true, data: { application } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update notes" }, 500);
        }
    },
);

const bulkAssignCwlBodySchema = z4.object({
    ids: z4.array(z4.number().int().min(1)).min(1).max(10000),
    clanTag: z4.string().nullable(),
});
const bulkAssignCwlData = z4.object({
    count: z4.number(),
    assignedTo: z4.string().nullable(),
});
app.post(
    "/cwl-applications/assign-bulk",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "assignCwlApplicationsBulk",
        description: "[Manager] Assigns (or unassigns when clanTag is null) many CWL applications to a CWL clan in one request.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Number of applications updated.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(bulkAssignCwlData)) } },
            },
            400: { description: "Bad request.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", bulkAssignCwlBodySchema),
    async (c) => {
        try {
            const { ids, clanTag } = c.req.valid("json");
            const result = await assignCwlApplicationsBulk(ids, clanTag);
            logAction(c, {
                action: clanTag ? "cwl_application.bulk_assign" : "cwl_application.bulk_unassign",
                targetType: "cwl_application",
                metadata: { count: result.count, assignedClanTag: clanTag, ids: result.ids },
            });
            return c.json({ success: true, data: { count: result.count, assignedTo: clanTag } });
        } catch (error: any) {
            const { code } = getDbErrorMessage(error);
            if (code === "23503") return c.json({ success: false, error: "CWL clan with this tag does not exist." }, 400);
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to assign CWL applications" }, 500);
        }
    },
);

const bulkDeleteCwlBodySchema = z4.object({
    ids: z4.array(z4.number().int().min(1)).min(1).max(10000),
});
const bulkDeleteCwlData = z4.object({
    count: z4.number(),
});
app.post(
    "/cwl-applications/delete-bulk",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "deleteCwlApplicationsBulk",
        description: "[Admin] Permanently deletes many CWL applications in one request. Deletion is an admin-only (sudo) power.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Number of applications deleted.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(bulkDeleteCwlData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", bulkDeleteCwlBodySchema),
    async (c) => {
        try {
            const { ids } = c.req.valid("json");
            const result = await deleteCwlApplicationsBulk(ids);
            logAction(c, {
                action: "cwl_application.bulk_delete",
                targetType: "cwl_application",
                metadata: { count: result.count, ids: result.ids },
            });
            return c.json({ success: true, data: { count: result.count } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to delete CWL applications" }, 500);
        }
    },
);

// Bonus table - manager perm (read-only join of CWL applications + account stats)

const bonusRowSchema = z4.object({
    id: z4.number(),
    cocAccountId: z4.number(),
    seasonId: z4.number(),
    discordUserId: z4.string(),
    discordUsername: z4.string(),
    image: z4.string().nullable(),
    cocAccountName: z4.string(),
    cocAccountTag: z4.string(),
    cocAccountClan: z4.string().nullable(),
    preferenceNum: z4.number(),
    assignedTo: z4.string().nullable(),
    notes: z4.string().nullable(),
    isExternal: z4.boolean(),
    warWeight: z4.number(),
    currentClan: z4.string().nullable(),
    townHall: z4.number(),
    totalDonated: z4.number(),
    totalReceived: z4.number(),
    clanGames: z4.number(),
    capitalGoldLooted: z4.number(),
    capitalGoldContributed: z4.number(),
    activityScore: z4.number(),
    ownerName: z4.string().nullable(),
    ownerImage: z4.string().nullable(),
    ownerRole: z4.string().nullable(),
});
const getBonusDataQuerySchema = z4.object({
    seasonId: z4.coerce.number().int().optional(),
});
const getBonusDataResponse = z4.object({
    rows: z4.array(bonusRowSchema),
    total: z4.number(),
    seasonId: z4.number().nullable(),
});
app.get(
    "/bonus",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getBonusData",
        description:
            "[Manager] Lists a season's CWL applicants joined with their linked account's stats (war weight, town hall, donations, capital gold, clan games, activity). Defaults to the current season.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Bonus rows.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(getBonusDataResponse)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("query", getBonusDataQuerySchema),
    async (c) => {
        try {
            const { seasonId } = c.req.valid("query");
            const result = await getBonusData(seasonId);
            return c.json({ success: true, data: result });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch bonus data" }, 500);
        }
    },
);

// CWL seasons - read for managers, create/delete for admins

const cwlSeasonSchema = z4.object({
    id: z4.number(),
    name: z4.string(),
    month: z4.string(),
    year: z4.number(),
    createdAt: z4.date().nullable(),
});
const getCwlSeasonsData = z4.object({ seasons: z4.array(cwlSeasonSchema) });
app.get(
    "/cwl-seasons",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getCwlSeasons",
        description: "[Manager] Lists all CWL seasons (newest first).",
        tags: ["admin"],
        responses: {
            200: { description: "Seasons.", content: { "application/json": { schema: resolver(SuccessResponseSchema(getCwlSeasonsData)) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    async (c) => {
        try {
            const result = await getCwlSeasons();
            return c.json({ success: true, data: result });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL seasons" }, 500);
        }
    },
);

const createCwlSeasonBodySchema = z4.object({
    name: z4.string().min(1),
    month: z4.string().min(1),
    year: z4.number().int(),
});
const createCwlSeasonData = z4.object({ season: cwlSeasonSchema });
app.post(
    "/cwl-seasons",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "createCwlSeason",
        description: "[Admin] Creates a new CWL season.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Created season.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(createCwlSeasonData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", createCwlSeasonBodySchema),
    async (c) => {
        try {
            const season = await createCwlSeason(c.req.valid("json"));
            logAction(c, { action: "cwl_season.create", targetType: "cwl_season", targetId: season.id, metadata: { name: season.name } });
            return c.json({ success: true, data: { season } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to create CWL season" }, 500);
        }
    },
);

const deleteCwlSeasonPathSchema = z4.object({ id: z4.coerce.number().int().min(1) });
app.delete(
    "/cwl-seasons/:id",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "deleteCwlSeason",
        description: "[Admin] Deletes a CWL season; cascades to its applications and bonuses.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Deleted season.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(z4.object({ id: z4.number() }))) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", deleteCwlSeasonPathSchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const season = await deleteCwlSeason(id);
            if (!season) return c.json({ success: false, error: "Season not found." }, 404);
            logAction(c, { action: "cwl_season.delete", targetType: "cwl_season", targetId: id, metadata: { name: season.name } });
            return c.json({ success: true, data: { id } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to delete CWL season" }, 500);
        }
    },
);

// CWL bonus ledger (one row per user per season) - manager perm

const getBonusLedgerResponse = z4.object({
    bonuses: z4.array(z4.object({ discordUserId: z4.string(), seasonId: z4.number(), cocAccountTag: z4.string().nullable() })),
});
app.get(
    "/bonus-ledger",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getBonusLedger",
        description: "[Manager] Lists every awarded bonus (one row per user per season).",
        tags: ["admin"],
        responses: {
            200: {
                description: "Bonus ledger.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(getBonusLedgerResponse)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    async (c) => {
        try {
            const result = await getBonusLedger();
            return c.json({ success: true, data: result });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch bonus ledger" }, 500);
        }
    },
);

const bonusData = z4.object({
    bonus: z4.object({ discordUserId: z4.string(), seasonId: z4.number(), cocAccountTag: z4.string().nullable() }).nullable(),
});
const setBonusBodySchema = z4.object({
    discordUserId: z4.string().min(1),
    seasonId: z4.number().int(),
    cocAccountTag: z4.string().min(1).nullable(),
    selected: z4.boolean(),
});
app.put(
    "/bonus",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "setUserSeasonBonus",
        description: "[Manager] Awards or removes a user's bonus for a season.",
        tags: ["admin"],
        responses: {
            200: { description: "Updated bonus.", content: { "application/json": { schema: resolver(SuccessResponseSchema(bonusData)) } } },
            400: { description: "Bad request.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", setBonusBodySchema),
    async (c) => {
        try {
            const { discordUserId, seasonId, cocAccountTag, selected } = c.req.valid("json");
            const bonus = await setUserSeasonBonus({ discordUserId, seasonId, cocAccountTag, selected });
            logAction(c, {
                action: selected ? "cwl_bonus.tick" : "cwl_bonus.untick",
                targetType: "cwl_bonus",
                targetId: discordUserId,
                metadata: { seasonId, cocAccountTag },
            });
            return c.json({ success: true, data: { bonus } });
        } catch (error: any) {
            const { code } = getDbErrorMessage(error);
            if (code === "23503") return c.json({ success: false, error: "Unknown user, account, or season." }, 400);
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update bonus" }, 500);
        }
    },
);

// CWL stats - live fetch from the CoC API for the season's assigned clans

const cwlAttackDetailSchema = z4.object({
    round: z4.number(),
    stars: z4.number(),
    destruction: z4.number(),
    position: z4.number(),
    defenderName: z4.string(),
    defenderTh: z4.number(),
    defenderPosition: z4.number(),
});
const getCwlStatsQuerySchema = z4.object({ seasonId: z4.coerce.number().int().optional() });
const getCwlStatsResponse = z4.object({
    stats: z4.array(
        z4.object({
            tag: z4.string(),
            name: z4.string(),
            attacks: z4.number(),
            stars: z4.number(),
            details: z4.array(cwlAttackDetailSchema),
        }),
    ),
});
app.get(
    "/cwl-stats",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getCwlStats",
        description:
            "[Manager] Live-fetches the current CWL from the CoC API for the season's assigned clans; returns per-player attacks used (of 7) and stars with a per-attack breakdown.",
        tags: ["admin"],
        responses: {
            200: { description: "CWL stats.", content: { "application/json": { schema: resolver(SuccessResponseSchema(getCwlStatsResponse)) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("query", getCwlStatsQuerySchema),
    async (c) => {
        try {
            const { seasonId } = c.req.valid("query");
            const result = await getCwlStats(seasonId);
            return c.json({ success: true, data: result });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL stats" }, 500);
        }
    },
);

// Settings - manage for read + toggles, sudo for siteMaintenance/guildId/clan CRUD

const settingsSchema = z4.object({
    id: z4.number(),
    applicationsEnabled: z4.boolean(),
    cwlEnabled: z4.boolean(),
    siteMaintenanceMode: z4.boolean(),
    rulesContent: z4.string().nullable(),
    guildId: z4.string().nullable(),
    currentCwlSeasonId: z4.number().nullable(),
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
    currentCwlSeasonId: z4.number().int().nullable().optional(),
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

// JPA Clans CRUD - manage read, sudo write

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
            422: { description: "Invalid Discord IDs.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            503: { description: "Discord verification unavailable.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", clanInputSchema),
    async (c) => {
        try {
            const body = c.req.valid("json");
            // Re-verify server-side so bad IDs can't be stored even if the UI is bypassed.
            try {
                const invalidMsg = await assertClanDiscordIds(body);
                if (invalidMsg) return c.json({ success: false, error: invalidMsg }, 422);
            } catch (error) {
                if (error instanceof DiscordRateLimitError || error instanceof DiscordUnavailableError) {
                    return c.json({ success: false, error: error.message }, 503);
                }
                throw error;
            }
            const clan = await createClan(body);
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
            422: { description: "Invalid Discord IDs.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            503: { description: "Discord verification unavailable.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", clanIdPathSchema),
    zValidator("json", clanInputSchema.partial()),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const body = c.req.valid("json");
            // Re-verify any Discord IDs present in this (partial) update.
            try {
                const invalidMsg = await assertClanDiscordIds(body);
                if (invalidMsg) return c.json({ success: false, error: invalidMsg }, 422);
            } catch (error) {
                if (error instanceof DiscordRateLimitError || error instanceof DiscordUnavailableError) {
                    return c.json({ success: false, error: error.message }, 503);
                }
                throw error;
            }
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

// Verify clan Discord IDs against the configured guild.
const verifyClanDiscordSchema = z4.object({
    discordClanRoleId: z4.string().optional(),
    discordMemberRoleId: z4.string().optional(),
    discordElderRoleId: z4.string().optional(),
    discordColeaderRoleId: z4.string().optional(),
    discordLeaderRoleId: z4.string().optional(),
    discordClanChannelId: z4.string().optional(),
    discordLeaderId: z4.string().optional(),
});
const discordFieldResultSchema = z4.object({
    valid: z4.boolean(),
    name: z4.string().optional(),
    reason: z4.string().optional(),
});
const verifyClanDiscordData = z4.object({
    ok: z4.boolean(),
    results: z4.record(z4.string(), discordFieldResultSchema),
});
app.post(
    "/clans/verify-discord",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "verifyAdminClanDiscord",
        description: "[Admin/sudo] Verifies that the provided Discord role/channel/user IDs exist in the configured guild.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Per-field verification result.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(verifyClanDiscordData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            503: { description: "Discord verification unavailable.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", verifyClanDiscordSchema),
    async (c) => {
        try {
            const result = await verifyClanDiscordIds(c.req.valid("json"));
            return c.json({ success: true, data: result });
        } catch (error) {
            if (error instanceof DiscordRateLimitError || error instanceof DiscordUnavailableError) {
                return c.json({ success: false, error: error.message }, 503);
            }
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to verify Discord IDs" }, 500);
        }
    },
);

// CWL Clans CRUD - manage read, sudo write

const cwlClanSchema = z4.object({
    cocClanTag: z4.string(),
    cocClanName: z4.string(),
    cocClanLeague: z4.string(),
    cocClanLeader: z4.string(),
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

// Creating only needs the tag — name, league and leader are pulled from the CoC API.
const createCwlClanSchema = z4.object({
    cocClanTag: z4.string().min(1).startsWith("#"),
});
const upsertCwlClanData = z4.object({
    clan: cwlClanSchema,
});
app.post(
    "/cwl-clans",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "createAdminCwlClan",
        description: "[Admin/sudo] Registers a CWL clan from its tag, fetching name, league and leader from the Clash of Clans API.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Created CWL clan.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(upsertCwlClanData)) } },
            },
            400: { description: "Invalid clan tag.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            409: { description: "Duplicate.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", createCwlClanSchema),
    async (c) => {
        try {
            const { cocClanTag } = c.req.valid("json");

            let data;
            try {
                data = await cocClient.getClan(cocClanTag);
            } catch (error) {
                Sentry.captureException(error);
                return c.json({ success: false, error: "Invalid clan tag or failed to fetch clan data." }, 400);
            }

            const clan = await createCwlClan({
                cocClanTag: data.tag,
                cocClanName: data.name,
                cocClanLeague: data.warLeague?.name ?? "Unranked",
                cocClanLeader: data.memberList.find((m) => m.role === "leader")?.name ?? "Unknown",
            });
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

// Refresh each CWL clan's name, league and leader from the Clash of Clans API
// (mirrors scripts/update-cwl-leagues.ts). Unranked clans omit warLeague.
const SYNC_CWL_LEAGUES_CONCURRENCY = 10;
const syncCwlLeaguesData = z4.object({
    updated: z4.number(),
    unchanged: z4.number(),
    failed: z4.number(),
    clans: z4.array(cwlClanSchema),
});
app.post(
    "/cwl-clans/sync-leagues",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "syncAdminCwlClanLeagues",
        description: "[Admin/sudo] Refreshes every CWL clan's league from the Clash of Clans API.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Sync summary and the refreshed CWL clan list.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(syncCwlLeaguesData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    async (c) => {
        try {
            const clans = await getAllCwlClans();
            let updated = 0;
            let unchanged = 0;
            let failed = 0;

            for (let i = 0; i < clans.length; i += SYNC_CWL_LEAGUES_CONCURRENCY) {
                const batch = clans.slice(i, i + SYNC_CWL_LEAGUES_CONCURRENCY);
                await Promise.all(
                    batch.map(async (clan) => {
                        try {
                            const data = await cocClient.getClan(clan.cocClanTag);
                            const name = data.name;
                            const league = data.warLeague?.name ?? "Unranked";
                            const leader = data.memberList.find((m) => m.role === "leader")?.name ?? "Unknown";

                            const changes: Partial<{ cocClanName: string; cocClanLeague: string; cocClanLeader: string }> = {};
                            if (name !== clan.cocClanName) changes.cocClanName = name;
                            if (league !== clan.cocClanLeague) changes.cocClanLeague = league;
                            if (leader !== clan.cocClanLeader) changes.cocClanLeader = leader;

                            if (Object.keys(changes).length === 0) {
                                unchanged++;
                                return;
                            }
                            await updateCwlClan(clan.cocClanTag, changes);
                            updated++;
                        } catch (error) {
                            failed++;
                            Sentry.captureException(error);
                        }
                    }),
                );
            }

            if (updated > 0) {
                logAction(c, {
                    action: "cwl_clan.sync_leagues",
                    targetType: "cwl_clan",
                    metadata: { updated, unchanged, failed },
                });
            }

            const refreshed = await getAllCwlClans();
            return c.json({ success: true, data: { updated, unchanged, failed, clans: refreshed } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to sync CWL leagues" }, 500);
        }
    },
);

// Audit log - manager+

const auditLogEntrySchema = z4.object({
    id: z4.number(),
    actorId: z4.string().nullable(),
    actorName: z4.string().nullable(),
    actorCurrentName: z4.string().nullable(),
    actorCurrentImage: z4.string().nullable(),
    actorCurrentRole: z4.enum(ROLES).nullable(),
    actorDiscordId: z4.string().nullable(),
    action: z4.enum(AUDIT_ACTIONS),
    targetType: z4.enum(AUDIT_TARGET_TYPES).nullable(),
    targetId: z4.string().nullable(),
    metadata: z4.unknown().nullable(),
    createdAt: z4.date(),
});

const getAuditLogQuerySchema = z4.object({
    actorId: z4.string().optional(),
    action: z4.enum(AUDIT_ACTIONS).optional(),
    targetType: z4.enum(AUDIT_TARGET_TYPES).optional(),
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

// COC accounts war weight - manager+

const cocAccountSchema = z4.object({
    id: z4.number(),
    discordUserId: z4.string(),
    cocAccountTag: z4.string(),
    warWeight: z4.number(),
    isExternal: z4.boolean(),
    currentClan: z4.string().nullable(),
    townHall: z4.number(),
    totalDonated: z4.number(),
    totalReceived: z4.number(),
    clanGames: z4.number(),
    capitalGoldLooted: z4.number(),
    capitalGoldContributed: z4.number(),
    activityScore: z4.number(),
    ownerUserId: z4.string().nullable(),
    ownerName: z4.string().nullable(),
    ownerImage: z4.string().nullable(),
    ownerRole: z4.string().nullable(),
});

const getCocAccountsQuerySchema = z4.object({
    search: z4.string().optional(),
    limit: z4.coerce.number().int().min(1).max(200).default(50),
    offset: z4.coerce.number().int().min(0).default(0),
    sortBy: z4.string().optional(),
    sortDir: z4.enum(["asc", "desc"]).optional(),
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

const createCocAccountBodySchema = z4.object({
    userId: z4.string().min(1, "userId is required"),
    tag: z4.string().min(1, "Account tag is required").max(20).startsWith("#", "Account tag must start with #"),
    warWeight: z4.coerce.number().int().min(0).default(0),
    isExternal: z4.boolean().default(false),
});
const createCocAccountData = z4.object({
    account: cocAccountSchema,
});
app.post(
    "/coc-accounts",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "createCocAccount",
        description:
            "[Admin] Manually links a Clash of Clans account to a member by tag, with an optional war weight and external flag. Skips the API-token ownership check, so it's an admin-only (sudo) power.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Linked COC account.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(createCocAccountData)) } },
            },
            400: { description: "Bad request.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Member not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            409: { description: "Account already linked.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", createCocAccountBodySchema),
    async (c) => {
        try {
            const { userId, tag, warWeight, isExternal } = c.req.valid("json");

            const discordId = await getDiscordAccountId(userId);
            if (!discordId) return c.json({ success: false, error: "Selected member has no linked Discord account." }, 404);

            // No API-token verification here (admin-only power); still validate the tag
            // against the CoC API and store the canonical tag it returns.
            let playerData;
            try {
                playerData = await cocClient.getPlayer(tag);
            } catch (error) {
                Sentry.captureException(error);
                return c.json({ success: false, error: "Invalid account tag or failed to fetch player data." }, 400);
            }

            const account = await addCocAccount(discordId, playerData.tag, { warWeight, isExternal });
            logAction(c, {
                action: "coc_account.create",
                targetType: "coc_account",
                targetId: account!.id,
                metadata: { cocAccountTag: account!.cocAccountTag, warWeight, isExternal, manual: true },
            });
            return c.json({ success: true, data: { account } });
        } catch (error: any) {
            const { message, constraint, code } = getDbErrorMessage(error);
            if (code === "23505") return c.json({ success: false, error: "This account is already linked." }, 409);
            Sentry.captureException(error, { extra: { message, constraint, code } });
            return c.json({ success: false, error: "Failed to add account." }, 500);
        }
    },
);

const SHEET_ID_RE = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
const SHEET_GID_RE = /[?#&]gid=(\d+)/;
const syncCocAccountsBodySchema = z4.object({
    sheetUrl: z4.url(),
});
const syncCocAccountsData = z4.object({
    updated: z4.number(),
    skipped: z4.number(),
    // Sheet rows whose tag isn't a linked account in the DB.
    notLinked: z4.array(z4.object({ tag: z4.string(), name: z4.string() })),
    // Linked accounts that had no row in the sheet.
    notInSheet: z4.array(z4.object({ cocAccountTag: z4.string(), ownerName: z4.string().nullable() })),
});
app.post(
    "/coc-accounts/sync",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "syncCocAccounts",
        description:
            "[Manager] Syncs Clash of Clans account stats from a link-viewable Google Sheet. Reads the sheet's CSV export (no API key), matches rows to accounts by tag, and updates clan, town hall, donations, clan games, capital gold and activity columns.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Sync result.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(syncCocAccountsData)) } },
            },
            400: {
                description: "Invalid sheet URL or sheet not publicly viewable.",
                content: { "application/json": { schema: resolver(ErrorResponseSchema) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", syncCocAccountsBodySchema),
    async (c) => {
        try {
            const { sheetUrl } = c.req.valid("json");
            const sheetId = sheetUrl.match(SHEET_ID_RE)?.[1];
            if (!sheetId) return c.json({ success: false, error: "Not a valid Google Sheets URL" }, 400);
            const gid = sheetUrl.match(SHEET_GID_RE)?.[1] ?? "0";

            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
            let res: Response;
            try {
                res = await fetch(csvUrl, { redirect: "follow", signal: AbortSignal.timeout(20000) });
            } catch {
                return c.json({ success: false, error: "Could not reach Google Sheets" }, 400);
            }
            const body = await res.text();
            // A private sheet redirects to an HTML sign-in page instead of CSV.
            if (!res.ok || res.headers.get("content-type")?.includes("text/html") || body.trimStart().startsWith("<")) {
                return c.json(
                    { success: false, error: "Sheet isn't publicly viewable. Set sharing to 'Anyone with the link' (Viewer) and try again." },
                    400,
                );
            }

            let records: Record<string, string>[];
            try {
                records = parse(body, { columns: true, skip_empty_lines: true, relax_column_count: true, bom: true, trim: true }) as Record<
                    string,
                    string
                >[];
            } catch {
                return c.json({ success: false, error: "Could not parse the sheet as CSV" }, 400);
            }
            const header = records[0];
            if (!header || !("Tag" in header)) {
                return c.json({ success: false, error: "Sheet must have a header row with a 'Tag' column" }, 400);
            }

            const toInt = (v: string | undefined) => {
                const n = parseInt((v ?? "").replace(/,/g, ""), 10);
                return Number.isFinite(n) ? n : 0;
            };
            const rows = records
                .filter((r) => (r["Tag"] ?? "").trim() !== "")
                .map((r) => ({
                    cocAccountTag: (r["Tag"] ?? "").trim(),
                    name: (r["Name"] ?? r["Username"] ?? "").trim(),
                    currentClan: (r["Current Clan"] ?? "").trim() || null,
                    townHall: toInt(r["Town Hall"]),
                    totalDonated: toInt(r["Total Donated"]),
                    totalReceived: toInt(r["Total Received"]),
                    clanGames: toInt(r["Clan Games"]),
                    capitalGoldLooted: toInt(r["Capital Gold Looted"]),
                    capitalGoldContributed: toInt(r["Capital Gold Contributed"]),
                    activityScore: toInt(r["Activity Score"]),
                }));

            const skipped = records.length - rows.length;
            const { updated, notFound, notInSheet } = await syncCocAccountStats(rows);
            const nameByTag = new Map(rows.map((r) => [r.cocAccountTag, r.name]));
            const notLinked = notFound.map((tag) => ({ tag, name: nameByTag.get(tag) ?? "" }));

            logAction(c, {
                action: "coc_account.sync",
                targetType: "coc_account",
                metadata: { sheetId, gid, updated, skipped, notLinked: notLinked.length, notInSheet: notInSheet.length },
            });

            return c.json({ success: true, data: { updated, skipped, notLinked, notInSheet } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to sync COC accounts" }, 500);
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
                action: "coc_account.stats_update",
                targetType: "coc_account",
                targetId: account.id,
                metadata: { cocAccountTag: account.cocAccountTag, fields: ["warWeight"], warWeight: account.warWeight },
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
                action: account.isExternal ? "coc_account.mark_external" : "coc_account.mark_main",
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

const updateCocAccountStatsBodySchema = z4
    .object({
        currentClan: z4.string().nullable(),
        totalDonated: z4.number().int().min(0),
        totalReceived: z4.number().int().min(0),
        clanGames: z4.number().int().min(0),
        capitalGoldLooted: z4.number().int().min(0),
        capitalGoldContributed: z4.number().int().min(0),
        activityScore: z4.number().int().min(0),
    })
    // Grid edits one cell at a time, so every field is optional; at least one is required.
    .partial()
    .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });
const updateCocAccountStatsData = z4.object({
    account: cocAccountSchema,
});
app.put(
    "/coc-accounts/:id/stats",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "updateCocAccountStats",
        description:
            "[Manager] Manually edits the stat columns (clan, donations, clan games, capital gold, activity score) of a linked Clash of Clans account. Only the provided fields are written; the next Google Sheet sync overwrites them.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Updated COC account.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(updateCocAccountStatsData)) } },
            },
            400: { description: "Invalid request.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", cocAccountIdPathSchema),
    zValidator("json", updateCocAccountStatsBodySchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const values = c.req.valid("json");
            const account = await updateCocAccountStats(id, values);
            if (!account) return c.json({ success: false, error: "COC account not found" }, 404);
            logAction(c, {
                action: "coc_account.stats_update",
                targetType: "coc_account",
                targetId: account.id,
                metadata: { cocAccountTag: account.cocAccountTag, fields: Object.keys(values) },
            });
            return c.json({ success: true, data: { account } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update COC account" }, 500);
        }
    },
);

const deleteCocAccountData = z4.object({
    account: cocAccountSchema,
});
app.delete(
    "/coc-accounts/:id",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "deleteCocAccount",
        description:
            "[Admin] Permanently deletes a Clash of Clans account. Cascades to that account's CWL applications. Deletion is an admin-only (sudo) power.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Deleted COC account.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(deleteCocAccountData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            404: { description: "Not found.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("param", cocAccountIdPathSchema),
    async (c) => {
        try {
            const { id } = c.req.valid("param");
            const account = await deleteCocAccount(id);
            if (!account) return c.json({ success: false, error: "COC account not found" }, 404);
            logAction(c, {
                action: "coc_account.delete",
                targetType: "coc_account",
                targetId: account.id,
                metadata: { cocAccountTag: account.cocAccountTag, discordUserId: account.discordUserId },
            });
            return c.json({ success: true, data: { account } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to delete COC account" }, 500);
        }
    },
);

const bulkDeleteCocAccountsBodySchema = z4.object({
    ids: z4.array(z4.number().int().min(1)).min(1).max(200),
});
const bulkDeleteCocAccountsData = z4.object({
    count: z4.number(),
});
app.post(
    "/coc-accounts/delete-bulk",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "deleteCocAccountsBulk",
        description:
            "[Admin] Permanently deletes many Clash of Clans accounts in one request. Cascades to each account's CWL applications. Deletion is an admin-only (sudo) power.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Number of accounts deleted.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(bulkDeleteCocAccountsData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    zValidator("json", bulkDeleteCocAccountsBodySchema),
    async (c) => {
        try {
            const { ids } = c.req.valid("json");
            const result = await deleteCocAccountsBulk(ids);
            logAction(c, {
                action: "coc_account.bulk_delete",
                targetType: "coc_account",
                metadata: { count: result.count, cocAccountTags: result.accounts.map((a) => a.cocAccountTag) },
            });
            return c.json({ success: true, data: { count: result.count } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to delete COC accounts" }, 500);
        }
    },
);

const getGuildNicknamesData = z4.object({
    nicknames: z4.record(z4.string(), z4.string()),
});
app.get(
    "/guild-nicknames",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "getGuildNicknames",
        description: "[Manager] Live Discord id -> guild nickname map for the configured guild.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Nickname map.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(getGuildNicknamesData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    async (c) => {
        try {
            const nicknames = await getGuildNicknames();
            return c.json({ success: true, data: { nicknames } });
        } catch (error) {
            if (error instanceof DiscordRateLimitError || error instanceof DiscordUnavailableError) {
                return c.json({ success: true, data: { nicknames: {} } });
            }
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch guild nicknames" }, 500);
        }
    },
);

const refreshDiscordUsernamesData = z4.object({
    total: z4.number(),
    matched: z4.number(),
    updated: z4.number(),
});
app.post(
    "/refresh-discord-usernames",
    hasAccessAuthMiddleware(isSuperadmin),
    describeRoute({
        operationId: "refreshDiscordUsernames",
        description: "[Superadmin/root] Re-fetches Discord usernames from the guild member list and updates stored values.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Backfill result.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(refreshDiscordUsernamesData)) } },
            },
            401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            503: { description: "Discord unavailable.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
            500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
        },
    }),
    async (c) => {
        try {
            const [usernames, users] = await Promise.all([getGuildUsernames(), getUsersWithDiscordAccounts()]);
            let matched = 0;
            let updated = 0;
            for (const u of users) {
                const username = usernames.get(u.discordId);
                if (!username) continue;
                matched++;
                if (username !== u.discordUsername) {
                    await setUserDiscordUsername(u.userId, username);
                    updated++;
                }
            }
            return c.json({ success: true, data: { total: users.length, matched, updated } });
        } catch (error) {
            if (error instanceof DiscordRateLimitError || error instanceof DiscordUnavailableError) {
                return c.json({ success: false, error: error.message }, 503);
            }
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to refresh Discord usernames" }, 500);
        }
    },
);

export default app;
