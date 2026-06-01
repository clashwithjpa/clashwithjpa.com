import { isAuthenticated, isVerified } from "@/lib/auth/functions";
import { logAction } from "@/lib/audit";
import { cocClient } from "@/lib/coc";
import { config } from "@/lib/config";
import { getDbErrorMessage } from "@/lib/db/error";
import {
    addClanApplication,
    addCocAccount,
    addCwlApplication,
    getDiscordAccountId,
    getUserCocAccounts,
    getUserCwlApplications,
    importCocAccountsForUser,
    setUserCocAccountExternal,
} from "@/lib/db/functions";
import { getImportableAccounts } from "@/lib/import-lookup";
import { getCachedSettings } from "@/lib/settings-cache";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
import { ErrorResponseSchema, SessionSchema, SuccessResponseSchema, UserSchema, type AppEnv } from "@/lib/types";
import { verifyTurnstileToken } from "@/lib/utils/cf";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import z4 from "zod/v4";

// All routes have /user as a prefix
// Each route has some level of auth middleware
const app = new Hono<AppEnv>();

const getUserData = z4.object({
    user: UserSchema,
    session: SessionSchema,
});
app.get(
    "/",
    hasAccessAuthMiddleware(isAuthenticated),
    describeRoute({
        operationId: "getUser",
        description: "[Authenticated] Fetches the current user's data.",
        tags: ["user"],
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getUserData)),
                    },
                },
                description: "User data fetched successfully.",
            },
            401: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Unauthorized.",
            },
            500: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Internal server error.",
            },
        },
    }),
    async (c) => {
        const user = c.get("user");
        const session = c.get("session");
        return c.json({
            success: true,
            data: { user, session },
        });
    },
);

const getUserAccounts = z4.object({
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
    "/accounts",
    hasAccessAuthMiddleware(isVerified),
    describeRoute({
        operationId: "getUserAccounts",
        description: "[Verified] Fetches the current user's Clash of Clans accounts.",
        tags: ["user"],
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getUserAccounts)),
                    },
                },
                description: "User accounts fetched successfully.",
            },
            401: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Unauthorized.",
            },
            500: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Internal server error.",
            },
        },
    }),
    async (c) => {
        const user = c.get("user");
        const session = c.get("session");
        if (!user || !session) {
            return c.json(
                {
                    success: false,
                    error: "Unauthorized",
                },
                401,
            );
        }
        const discordId = await getDiscordAccountId(user.id);
        if (!discordId) {
            return c.json(
                {
                    success: false,
                    error: "No linked Discord account found.",
                },
                500,
            );
        }
        const accounts = await getUserCocAccounts(discordId);
        return c.json({
            success: true,
            data: { accounts },
        });
    },
);

const postImportAccountsData = z4.object({
    imported: z4.array(
        z4.object({
            cocAccountTag: z4.string(),
            warWeight: z4.number(),
        }),
    ),
    available: z4.number(),
});
app.post(
    "/accounts/import",
    hasAccessAuthMiddleware(isAuthenticated),
    describeRoute({
        operationId: "importUserAccounts",
        description:
            "[Authenticated] Imports any pre-existing Clash of Clans accounts linked to the user's Discord ID from the migration dataset. Skips accounts already linked. Upgrades the user to 'verified' if at least one account was imported.",
        tags: ["user"],
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(postImportAccountsData)),
                    },
                },
                description: "Accounts imported (or nothing to import).",
            },
            401: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Unauthorized.",
            },
            500: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Internal server error.",
            },
        },
    }),
    async (c) => {
        const user = c.get("user");
        const session = c.get("session");
        if (!user || !session) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        const discordId = await getDiscordAccountId(user.id);
        if (!discordId) {
            return c.json({ success: false, error: "No linked Discord account found." }, 500);
        }

        const candidates = await getImportableAccounts(discordId);
        if (candidates.length === 0) {
            return c.json({
                success: true,
                data: { imported: [], available: 0 },
            });
        }

        try {
            const inserted = await importCocAccountsForUser(user.id, discordId, candidates);
            if (inserted.length > 0) {
                logAction(c, {
                    action: "coc_account.import",
                    targetType: "coc_account",
                    metadata: { count: inserted.length },
                });
            }
            return c.json({
                success: true,
                data: {
                    imported: inserted.map((row) => ({ cocAccountTag: row.cocAccountTag, warWeight: row.warWeight })),
                    available: candidates.length,
                },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to import accounts." }, 500);
        }
    },
);

const postApplyAccountBody = z4
    .object({
        cocAccountTag: z4.string().min(1, "Account tag is required").max(20).startsWith("#", "Account tag must start with #"),
        apiToken: z4.string().min(1, "API token is required").max(500),
        captchaToken: z4.string().max(2048).nullish(),
        isExternal: z4.boolean().optional().default(false),
        warWeight: z4.int().min(1, "War weight is required").max(9999999).optional(),
    })
    .refine((d) => !d.isExternal || typeof d.warWeight === "number", {
        message: "War weight is required for external accounts",
        path: ["warWeight"],
    });
const postApplyAccountData = z4.object({
    application: z4
        .object({
            id: z4.number(),
            cocAccountTag: z4.string(),
            cocAccountData: z4.unknown(),
            discordUserId: z4.string(),
            status: z4.string(),
            createdAt: z4.date(),
        })
        .optional(),
    account: z4
        .object({
            id: z4.number(),
            cocAccountTag: z4.string(),
            warWeight: z4.number(),
            isExternal: z4.boolean(),
        })
        .optional(),
});
app.post(
    "/accounts/apply",
    hasAccessAuthMiddleware(isAuthenticated),
    describeRoute({
        operationId: "applyUserAccount",
        description: "[Authenticated] Submits a clan application for a Clash of Clans account after verifying ownership.",
        tags: ["user"],
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(postApplyAccountData)),
                    },
                },
                description: "Application submitted successfully.",
            },
            400: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Bad request (captcha failed or token verification failed).",
            },
            401: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Unauthorized.",
            },
            403: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Applications closed, or external account add requires a verified member.",
            },
            409: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Application already exists for this account.",
            },
            500: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Internal server error.",
            },
        },
    }),
    zValidator("json", postApplyAccountBody),
    async (c) => {
        const user = c.get("user");
        const session = c.get("session");
        if (!user || !session) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        const settings = await getCachedSettings();
        if (!settings?.applicationsEnabled) {
            return c.json({ success: false, error: "Applications are currently closed." }, 403);
        }

        const { cocAccountTag, apiToken, captchaToken, isExternal, warWeight } = c.req.valid("json");

        if (config.NODE_ENV !== "development") {
            const isCaptchaValid = await verifyTurnstileToken(captchaToken!);
            if (!isCaptchaValid) {
                return c.json({ success: false, error: "Captcha verification failed." }, 400);
            }
        }

        let playerData;
        try {
            playerData = await cocClient.getPlayer(cocAccountTag);
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Invalid account tag or failed to fetch player data." }, 400);
        }

        if (!apiToken) {
            return c.json({ success: false, error: "API token is required." }, 400);
        }

        if (config.NODE_ENV !== "development") {
            try {
                const verifyResult = await cocClient.verifyPlayerToken(cocAccountTag, apiToken);
                if (verifyResult.status !== "ok") {
                    return c.json({ success: false, error: "API token verification failed. This account does not belong to you." }, 400);
                }
            } catch (error) {
                Sentry.captureException(error);
                return c.json({ success: false, error: "Failed to verify API token." }, 500);
            }
        }

        const discordId = await getDiscordAccountId(user.id);
        if (!discordId) {
            return c.json({ success: false, error: "No linked Discord account found." }, 500);
        }

        // External accounts (e.g. accounts a member only brings for CWL) skip the
        // admin approval flow and are linked directly with a self-reported war weight.
        // Restricted to verified+ members.
        if (isExternal) {
            const verified = await isVerified(user.id);
            if (!verified.success) {
                return c.json({ success: false, error: "Only verified members can add external accounts." }, 403);
            }
            try {
                const account = await addCocAccount(discordId, cocAccountTag, { warWeight, isExternal: true });
                logAction(c, {
                    action: "coc_account.create",
                    targetType: "coc_account",
                    targetId: account!.id,
                    metadata: { cocAccountTag, warWeight, isExternal: true },
                });
                return c.json({
                    success: true,
                    data: { account },
                });
            } catch (error: any) {
                const { message, constraint, code } = getDbErrorMessage(error);
                if (code === "23505") {
                    return c.json({ success: false, error: "This account is already linked." }, 409);
                }

                Sentry.captureException(error, { extra: { message, constraint, code } });
                return c.json({ success: false, error: "Failed to add account." }, 500);
            }
        }

        try {
            const application = await addClanApplication(discordId, cocAccountTag, playerData);
            logAction(c, {
                action: "clan_application.create",
                targetType: "clan_application",
                targetId: application.id,
                metadata: { cocAccountTag },
            });
            return c.json({
                success: true,
                data: { application },
            });
        } catch (error: any) {
            const { message, constraint, code } = getDbErrorMessage(error);
            if (code === "23505") {
                return c.json({ success: false, error: "Application already exists for this account." }, 409);
            }

            Sentry.captureException(error, { extra: { message, constraint, code } });
            return c.json({ success: false, error: "Failed to submit application." }, 500);
        }
    },
);

const putAccountExternalPathSchema = z4.object({
    id: z4.coerce.number().int().min(1),
});
const putAccountExternalData = z4.object({
    account: z4.object({
        id: z4.number(),
        discordUserId: z4.string(),
        cocAccountTag: z4.string(),
        warWeight: z4.number(),
        isExternal: z4.boolean(),
    }),
});
app.put(
    "/accounts/:id/external",
    hasAccessAuthMiddleware(isVerified),
    describeRoute({
        operationId: "setUserAccountExternal",
        description:
            "[Verified] Converts one of the current user's own Clash of Clans accounts to external. One-way: members can only mark an account external, not revert it (reverting to a main account is staff-only). War weight is left unchanged.",
        tags: ["user"],
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(putAccountExternalData)),
                    },
                },
                description: "Account converted to external successfully.",
            },
            401: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Unauthorized.",
            },
            404: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Account not found or not linked to the current user.",
            },
            500: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Internal server error.",
            },
        },
    }),
    zValidator("param", putAccountExternalPathSchema),
    async (c) => {
        const user = c.get("user");
        const session = c.get("session");
        if (!user || !session) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        const { id } = c.req.valid("param");

        const discordId = await getDiscordAccountId(user.id);
        if (!discordId) {
            return c.json({ success: false, error: "No linked Discord account found." }, 500);
        }

        try {
            const account = await setUserCocAccountExternal(id, discordId);
            if (!account) {
                return c.json({ success: false, error: "Account not found or not linked to your profile." }, 404);
            }
            logAction(c, {
                action: "coc_account.mark_external",
                targetType: "coc_account",
                targetId: account.id,
                metadata: { cocAccountTag: account.cocAccountTag, isExternal: true },
            });
            return c.json({
                success: true,
                data: { account },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update account." }, 500);
        }
    },
);

const getCwlApplicationsData = z4.object({
    applications: z4.array(
        z4.object({
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
        }),
    ),
});
app.get(
    "/cwl",
    hasAccessAuthMiddleware(isVerified),
    describeRoute({
        operationId: "getUserCwlApplications",
        description: "[Verified] Fetches the current user's CWL applications.",
        tags: ["user"],
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getCwlApplicationsData)),
                    },
                },
                description: "CWL applications fetched successfully.",
            },
            401: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Unauthorized.",
            },
            500: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Internal server error.",
            },
        },
    }),
    async (c) => {
        const user = c.get("user");
        const session = c.get("session");
        if (!user || !session) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        const discordId = await getDiscordAccountId(user.id);
        if (!discordId) {
            return c.json({ success: false, error: "No linked Discord account found." }, 500);
        }

        try {
            const applications = await getUserCwlApplications(discordId);
            return c.json({
                success: true,
                data: { applications },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL applications." }, 500);
        }
    },
);

const postCwlApplyBody = z4.object({
    preferenceNum: z4.int().min(1).max(99),
    tag: z4.string().min(1, "Account tag is required").max(20).startsWith("#", "Account tag must start with #"),
    accountClan: z4.string().max(50).nullable().optional(),
});
const postCwlApplyData = z4.object({
    application: z4.object({
        id: z4.number(),
        cocAccountTag: z4.string(),
        cocAccountClan: z4.string().nullable(),
        cocAccountWeight: z4.number(),
        preferenceNum: z4.number(),
        month: z4.string(),
        year: z4.number(),
        appliedAt: z4.date(),
    }),
});
app.post(
    "/cwl/apply",
    hasAccessAuthMiddleware(isVerified),
    describeRoute({
        operationId: "applyCwl",
        description: "[Verified] Submits a CWL application for a Clash of Clans account.",
        tags: ["user"],
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(postCwlApplyData)),
                    },
                },
                description: "CWL application submitted successfully.",
            },
            400: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Bad request (invalid tag or failed to fetch player data).",
            },
            401: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Unauthorized.",
            },
            409: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Duplicate preference number for this account or user.",
            },
            500: {
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
                description: "Internal server error.",
            },
        },
    }),
    zValidator("json", postCwlApplyBody),
    async (c) => {
        const user = c.get("user");
        const session = c.get("session");
        if (!user || !session) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        const settings = await getCachedSettings();
        if (!settings?.cwlEnabled) {
            return c.json({ success: false, error: "CWL applications are currently closed." }, 403);
        }

        const { preferenceNum, tag, accountClan } = c.req.valid("json");

        const discordId = await getDiscordAccountId(user.id);
        if (!discordId) {
            return c.json({ success: false, error: "No linked Discord account found." }, 500);
        }

        const userAccounts = await getUserCocAccounts(discordId);
        const matchedAccount = userAccounts.find((acc) => acc.cocAccountTag === tag);
        if (!matchedAccount) {
            return c.json({ success: false, error: "This account is not linked to your profile. Link it first to apply." }, 400);
        }
        const resolvedWeight = matchedAccount.warWeight;

        // Alt/external status comes from the linked account; only non-external
        // (main) accounts pick a clan to participate with.
        const isExternal = matchedAccount.isExternal;
        if (!isExternal && (typeof accountClan !== "string" || accountClan.trim().length === 0)) {
            return c.json({ success: false, error: "Account clan is required.", path: ["accountClan"] }, 400);
        }

        let playerData;
        try {
            playerData = await cocClient.getPlayer(tag);
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Invalid account tag or failed to fetch player data." }, 400);
        }

        try {
            const application = await addCwlApplication({
                discordUserId: discordId,
                discordUsername: user.name,
                cocAccountName: playerData.name,
                cocAccountTag: tag,
                cocAccountClan: isExternal ? null : (accountClan ?? null),
                preferenceNum,
            });
            logAction(c, {
                action: "cwl_application.create",
                targetType: "cwl_application",
                targetId: application.id,
                metadata: {
                    cocAccountTag: tag,
                    month: application.month,
                    year: application.year,
                    preferenceNum,
                    isExternal,
                },
            });
            return c.json({
                success: true,
                data: { application: { ...application, cocAccountWeight: resolvedWeight } },
            });
        } catch (error: any) {
            const { message, constraint, code } = getDbErrorMessage(error);
            if (code === "23505") {
                const errorMessage =
                    constraint === "cwl_table_accountTag_month_year_unique"
                        ? "You've already applied with this account this season."
                        : "This preference number is already in use. Each preference number can only be used once per account and per user.";
                return c.json({ success: false, error: errorMessage }, 409);
            }

            Sentry.captureException(error, { extra: { message, constraint, code } });
            return c.json({ success: false, error: "Failed to submit CWL application." }, 500);
        }
    },
);

export default app;
