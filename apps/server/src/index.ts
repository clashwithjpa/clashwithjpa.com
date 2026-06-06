import { config } from "@/lib/config";
import { getCachedSettings } from "@/lib/settings-cache";
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
import admin from "./routes/admin";
import coc from "./routes/coc";
import manage from "./routes/manage";
import upload from "./routes/upload";
import user from "./routes/user";

const client = new RedisClient(config.JPA_REDIS_URL);

const app = new Hono<AppEnv>();

app.use(
    "*",
    every(
        logger(),
        cors({
            origin: [config.JPA_AUTH_URL, config.JPA_APP_URL],
            allowHeaders: ["Content-Type", "Authorization", "x-request-id", "x-visitor-id"],
            allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
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
            limit: 120,
            skip: (c) => {
                // Better Auth applies its own per-path rate limits to /api/auth/*,
                // so let it own that namespace instead of double-limiting here.
                if (c.req.path.startsWith("/api/auth/")) return true;
                // Skip rate limiting in development for requests from the frontend.
                return config.NODE_ENV === "development" && c.req.header("origin") === config.JPA_APP_URL;
            },
            keyGenerator: (c) => {
                // Behind Cloudflare in prod; cf-connecting-ip is the authoritative client IP.
                // Fall back to leftmost x-forwarded-for hop, then x-real-ip. Last resort is a shared
                // "unknown" bucket so a missing-header attacker can't escape the limiter.
                const cf = c.req.header("cf-connecting-ip");
                if (cf) return cf;
                const xff = c.req.header("x-forwarded-for");
                if (xff) return xff.split(",")[0]!.trim();
                return c.req.header("x-real-ip") ?? "unknown";
            },
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
            const settings = await getCachedSettings();
            return c.json({
                success: true,
                data: { rules: settings?.rulesContent ?? null },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch rules" }, 500);
        }
    },
);

app.route("/coc", coc);
app.route("/admin", admin);
app.route("/manage", manage);
app.route("/user", user);
app.route("/upload", upload);

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
