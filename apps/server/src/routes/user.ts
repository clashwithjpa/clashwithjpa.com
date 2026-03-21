import { Hono } from "hono";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
import { isVerified, isAuthenticated } from "@/lib/auth/functions";
import * as Sentry from "@sentry/bun";
import z4 from "zod/v4";
import { validator as zValidator, resolver, describeRoute } from "hono-openapi";
import { SuccessResponseSchema, ErrorResponseSchema, type AppEnv, UserSchema, SessionSchema } from "@/lib/types";
import { verifyTurnstileToken } from "@/lib/utils/cf";
import { getUserCocAccounts, getDiscordAccountId, addClanApplication } from "@/lib/db/functions";
import { cocClient } from "@/lib/coc";
import { config } from "@/lib/config";
import { getDbErrorMessage } from "@/lib/db/error";

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
        description: "Fetches the current user's data.",
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
        description: "Fetches the current user's Clash of Clans accounts.",
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
    cocAccountTag: z4.string().min(1, "Account tag is required").startsWith("#", "Account tag must start with #"),
    apiToken: z4.string().min(1, "API token is required"),
    captchaToken: z4.string().nullish(),
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
        description: "Submits a clan application for a Clash of Clans account after verifying ownership.",
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

export default app;
