import { isAuthenticated, isVerified } from "@/lib/auth/functions";
import { cocClient } from "@/lib/coc";
import { config } from "@/lib/config";
import { getDbErrorMessage } from "@/lib/db/error";
import {
    addClanApplication,
    addCwlApplication,
    getCocAccountOwner,
    getDiscordAccountId,
    getUserCocAccounts,
    getUserCwlApplications,
} from "@/lib/db/functions";
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

const postApplyAccountBody = z4.object({
    cocAccountTag: z4.string().min(1, "Account tag is required").max(20).startsWith("#", "Account tag must start with #"),
    apiToken: z4.string().min(1, "API token is required").max(500),
    captchaToken: z4.string().max(2048).nullish(),
});
const postApplyAccountData = z4.object({
    application: z4.object({
        id: z4.number(),
        cocAccountTag: z4.string(),
        cocAccountData: z4.unknown(),
        discordUserId: z4.string(),
        status: z4.string(),
        createdAt: z4.date(),
    }),
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

        const { cocAccountTag, apiToken, captchaToken } = await c.req.json();

        if (config.NODE_ENV !== "development") {
            const isCaptchaValid = await verifyTurnstileToken(captchaToken);
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

        try {
            const application = await addClanApplication(discordId, cocAccountTag, playerData);
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

const getCwlApplicationsData = z4.object({
    applications: z4.array(
        z4.object({
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
        }),
    ),
});
app.get(
    "/cwl",
    hasAccessAuthMiddleware(isVerified),
    describeRoute({
        operationId: "getUserCwlApplications",
        description: "[Verified] Fetches the current user's CWL applications for the current month/year.",
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
    isAlt: z4.boolean(),
    preferenceNum: z4.int().min(1).max(99),
    tag: z4.string().min(1, "Account tag is required").max(20).startsWith("#", "Account tag must start with #"),
    accountClan: z4.string().min(1, "Account clan is required").max(50),
    accountWeight: z4.int().min(1, "Account weight is required").max(9999999),
});
const postCwlApplyData = z4.object({
    application: z4.object({
        id: z4.number(),
        cocAccountTag: z4.string(),
        cocAccountClan: z4.string(),
        cocAccountWeight: z4.number(),
        isAlt: z4.boolean(),
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

        const { isAlt, preferenceNum, tag, accountClan, accountWeight } = await c.req.json();

        const discordId = await getDiscordAccountId(user.id);
        if (!discordId) {
            return c.json({ success: false, error: "No linked Discord account found." }, 500);
        }

        if (!isAlt) {
            const userAccounts = await getUserCocAccounts(discordId);
            const accountExists = userAccounts.some((acc) => acc.cocAccountTag === tag);
            if (!accountExists) {
                return c.json({ success: false, error: "This account is not linked to your profile. Link it first or mark it as an alt." }, 400);
            }
        } else {
            const existingOwner = await getCocAccountOwner(tag);
            if (existingOwner) {
                return c.json({ success: false, error: "This account is already linked to another user. It cannot be used as an alt." }, 400);
            }
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
                cocAccountClan: accountClan,
                cocAccountWeight: accountWeight,
                isAlt,
                preferenceNum,
            });
            return c.json({
                success: true,
                data: { application },
            });
        } catch (error: any) {
            const { message, constraint, code } = getDbErrorMessage(error);
            if (code === "23505") {
                return c.json(
                    {
                        success: false,
                        error: "This preference number is already in use. Each preference number can only be used once per account and per user.",
                    },
                    409,
                );
            }

            Sentry.captureException(error, { extra: { message, constraint, code } });
            return c.json({ success: false, error: "Failed to submit CWL application." }, 500);
        }
    },
);

export default app;
