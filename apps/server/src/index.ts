import "dotenv/config";
import * as Sentry from "@sentry/bun";
import { auth } from "@lib/auth";
import { Hono } from "hono";
import { rateLimiter, type Store } from "hono-rate-limiter";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import RedisClient from "ioredis";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { every } from "hono/combine";
import { csrf } from "hono/csrf";
import { requestId, type RequestIdVariables } from "hono/request-id";
import { logger } from "hono/logger";
import { compress } from "@hono/bun-compress";
import { betterAuthMiddleware } from "@/lib/middlewares";
import { openAPIRouteHandler } from "hono-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { validator as zValidator, resolver, describeRoute } from "hono-openapi";
import z4 from "zod/v4";
import { ApiResponseSchema, SuccessResponseSchema, ErrorResponseSchema } from "@/lib/types";
import coc from "./routes/coc";

const client = new RedisClient("redis://default@localhost:7102");

const app = new Hono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    } & RequestIdVariables;
}>();

app.use(
    "*",
    every(
        logger(),
        cors({
            origin: [process.env.JPA_AUTH_URL!, process.env.JPA_APP_URL!],
            allowHeaders: ["Content-Type", "Authorization"],
            allowMethods: ["POST", "GET", "OPTIONS"],
            exposeHeaders: ["Content-Length"],
            maxAge: 600,
            credentials: true,
        }),
        csrf({
            origin: [process.env.JPA_AUTH_URL!, process.env.JPA_APP_URL!],
        }),

        // Use cloudflare ray id in production - https://developers.cloudflare.com/fundamentals/reference/cloudflare-ray-id/
        // https://hono.dev/docs/middleware/builtin/request-id#headername-string
        requestId(),

        betterAuthMiddleware,

        rateLimiter({
            windowMs: 1 * 60 * 1000, // 1 minute
            limit: 60, // Limit each client to 60 requests per window
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
        description: "Welcome route for the API. This route is used to verify that the API is up and running.",
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

app.get(
    "/login",
    describeRoute({
        operationId: "login",
        description: "Initiates the social login process. Currently supports Discord as the provider.",
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

app.route("/coc", coc);

app.get(
    "/openapi",
    openAPIRouteHandler(app, {
        documentation: {
            info: {
                title: "ClashWithJPA API",
                version: "1.0.0",
                description:
                    "API Documentation for ClashWithJPA. This API is used by the frontend hosted at https://clashwithjpa.com. You can find better-auth reference at /api/auth/reference",
            },
            servers: [{ url: "http://localhost:3000", description: "Local Server" }],
        },
    }),
);

app.get(
    "/scalar",
    Scalar((c) => {
        return {
            pageTitle: "ClashWithJPA API Documentation",
            url: "/openapi",
            theme: "saturn",
        };
    }),
);

export default app;
