import { config } from "@/lib/config";
import { getRules } from "@/lib/db/functions";
import { betterAuthMiddleware } from "@/lib/middlewares";
import { ErrorResponseSchema, SuccessResponseSchema, type AppEnv } from "@/lib/types";
import { compress } from "@hono/bun-compress";
import { auth } from "@lib/auth";
import { Scalar } from "@scalar/hono-api-reference";
import * as Sentry from "@sentry/bun";
import "dotenv/config";
import { Hono } from "hono";
import { describeRoute, openAPIRouteHandler, resolver } from "hono-openapi";
import { rateLimiter, type Store } from "hono-rate-limiter";
import { every } from "hono/combine";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import RedisClient from "ioredis";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import z4 from "zod/v4";
import coc from "./routes/coc";
import manage from "./routes/manage";
import user from "./routes/user";

const client = new RedisClient("redis://default@localhost:7102");

const app = new Hono<AppEnv>();

app.use(
    "*",
    every(
        logger(),
        cors({
            origin: [config.JPA_AUTH_URL, config.JPA_APP_URL],
            allowHeaders: ["Content-Type", "Authorization"],
            allowMethods: ["POST", "GET", "OPTIONS"],
            exposeHeaders: ["Content-Length"],
            maxAge: 600,
            credentials: true,
        }),
        csrf({
            origin: [config.JPA_AUTH_URL, config.JPA_APP_URL],
        }),

        // Use cloudflare ray id in production - https://developers.cloudflare.com/fundamentals/reference/cloudflare-ray-id/
        // https://hono.dev/docs/middleware/builtin/request-id#headername-string
        requestId(),

        betterAuthMiddleware,

        rateLimiter({
            windowMs: 1 * 60 * 1000, // 1 minute
            limit: 60, // Limit each client to 60 requests per window
            skip: (c) => config.NODE_ENV === "development" && c.req.header("origin") === config.JPA_APP_URL, // Skip rate limiting in development for requests from the frontend
            // TODO: https://honohub.dev/docs/rate-limiter/troubleshooting#solution-2
            keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "",
            store: new RedisStore({
                sendCommand: (command: string, ...args: string[]) => client.call(command, ...args) as Promise<RedisReply>,
            }) as unknown as Store, // Type assertion to fix typescript error (https://honohub.dev/docs/rate-limiter/troubleshooting#solution)
        }),

        compress(),
    ),
);

app.onError((err, c) => {
    Sentry.captureException(err);
    if (err instanceof HTTPException) {
        return err.getResponse();
    }
    return c.json({ success: false, error: "Internal server error" }, 500);
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
});

const getRootData = z4.object({
    message: z4.string(),
});
app.get(
    "/",
    describeRoute({
        operationId: "getRoot",
        description: "[Public] Welcome route for the API. This route is used to verify that the API is up and running.",
        tags: ["root"],
        responses: {
            200: {
                description: "Successful response with a welcome message.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getRootData)),
                    },
                },
            },
        },
    }),
    (c) => {
        return c.json({
            success: true,
            data: {
                message: "Welcome to the ClashWithJPA API! Visit /scalar for API documentation.",
            },
        });
    },
);

const getLoginData = z4.object({
    url: z4.url(),
    redirect: z4.literal(true),
});
app.get(
    "/login",
    describeRoute({
        operationId: "login",
        description: "[Public] Use this only for backend/scalar usage. For frontend, authClient should be used.",
        tags: ["root"],
        responses: {
            200: {
                description: "Successful response with a login URL.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getLoginData)),
                    },
                },
            },
        },
    }),
    async (c) => {
        const socialLogin = await auth.api.signInSocial({
            body: {
                provider: "discord",
            },
            asResponse: true,
        });

        return socialLogin;
    },
);

const postLogoutData = z4.object({
    message: z4.string(),
});
app.post(
    "/logout",
    describeRoute({
        operationId: "logout",
        description: "[Public] Use this only for backend/scalar usage. For frontend, authClient should be used.",
        tags: ["root"],
        responses: {
            200: {
                description: "Successful response with a logout message.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(postLogoutData)),
                    },
                },
            },
            500: {
                description: "Server error response when logging out fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    async (c) => {
        try {
            const logout = await auth.api.signOut({
                headers: c.req.raw.headers,
            });
            if (logout.success) {
                return c.json({
                    success: true,
                    data: {
                        message: "Logged out successfully",
                    },
                });
            }
            return c.json({ success: false, error: "Failed to log out" }, 500);
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to log out" }, 500);
        }
    },
);

const getRulesData = z4.object({
    rules: z4.string().nullable(),
});
app.get(
    "/rules",
    describeRoute({
        operationId: "getRules",
        description: "[Public] Fetches the current rules content.",
        tags: ["root"],
        responses: {
            200: {
                description: "Successful response with the rules content.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getRulesData)),
                    },
                },
            },
            500: {
                description: "Server error response when fetching rules fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    async (c) => {
        try {
            const rules = await getRules();
            return c.json({
                success: true,
                data: { rules },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch rules" }, 500);
        }
    },
);

// Routes here
app.route("/coc", coc);
app.route("/manage", manage);
app.route("/user", user);

app.get(
    "/openapi.json",
    openAPIRouteHandler(app, {
        documentation: {
            info: {
                title: "ClashWithJPA API",
                version: "1.0.0",
                description:
                    "API Documentation for ClashWithJPA. This API is used by the frontend hosted at https://clashwithjpa.com. You can find better-auth reference at /api/auth/reference",
            },
            servers: [
                { url: "http://localhost:3000", description: "Local Server" },
                { url: "https://api.clashwithjpa.com", description: "Production Server" },
            ],
            externalDocs: {
                url: "/api/auth/reference",
                description: "Better Auth Reference",
            },
        },
    }),
);

app.get(
    "/scalar",
    Scalar((c) => {
        return {
            pageTitle: "ClashWithJPA API Documentation",
            url: "/openapi.json",
            theme: "kepler",
            agent: {
                disabled: true,
            },
            darkMode: true,
            favicon: "https://avatars.githubusercontent.com/u/154704188?s=200&v=4",
            showOperationId: true,
            metaData: {
                title: "ClashWithJPA API Documentation",
                description:
                    "API Documentation for ClashWithJPA. This API is used by the frontend hosted at https://clashwithjpa.com. You can find better-auth reference at /api/auth/reference",
                ogDescription:
                    "API Documentation for ClashWithJPA. This API is used by the frontend hosted at https://clashwithjpa.com. You can find better-auth reference at /api/auth/reference",
                ogTitle: "ClashWithJPA API Documentation",
            },
            telemetry: false,
        };
    }),
);

export default app;
