import { isApiKeyAllowedPath } from "@/lib/api-access";
import { apiUsageMiddleware } from "@/lib/api-usage";
import { config } from "@/lib/config";
import { betterAuthMiddleware } from "@/lib/middlewares";
import { getCachedSettings } from "@/lib/settings-cache";
import { ErrorResponseSchema, SuccessResponseSchema, type AppEnv } from "@/lib/types";
import { compress } from "@hono/bun-compress";
import { auth } from "@lib/auth";
import { Scalar } from "@scalar/hono-api-reference";
import * as Sentry from "@sentry/bun";
import { createHash } from "crypto";
import "dotenv/config";
import { Hono } from "hono";
import { describeRoute } from "@/lib/openapi";
import { openAPIRouteHandler, resolver } from "hono-openapi";
import { rateLimiter, type Store } from "hono-rate-limiter";
import { every } from "hono/combine";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import RedisClient from "ioredis";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import z4 from "zod/v4";
import admin from "./routes/admin";
import analytics from "./routes/analytics";
import apiKeys from "./routes/api-keys";
import coc from "./routes/coc";
import manage from "./routes/manage";
import upload from "./routes/upload";
import user from "./routes/user";

const client = new RedisClient(config.JPA_REDIS_URL);

const app = new Hono<AppEnv>();

const csrfMiddleware = csrf({
    origin: [config.JPA_AUTH_URL, config.JPA_APP_URL],
});

// CSRF protects against a browser riding an ambient cookie. A request carrying
// an explicit `x-api-key` header cannot be forged that way, and machine clients
// send no Origin at all — which the check would otherwise reject on every
// non-GET.
const conditionalCsrf = createMiddleware<AppEnv>(async (c, next) => {
    if (c.req.header("x-api-key")) return next();
    return csrfMiddleware(c, next);
});

app.use(
    "*",
    every(
        logger(),
        cors({
            origin: [config.JPA_AUTH_URL, config.JPA_APP_URL],
            allowHeaders: ["Content-Type", "Authorization", "x-api-key", "x-request-id", "x-visitor-id"],
            exposeHeaders: ["Content-Length"],
            maxAge: 600,
            credentials: true,
        }),
        conditionalCsrf,

        // Use cloudflare ray id in production - https://developers.cloudflare.com/fundamentals/reference/cloudflare-ray-id/
        // https://hono.dev/docs/middleware/builtin/request-id#headername-string
        requestId(),

        betterAuthMiddleware,

        apiUsageMiddleware,

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
                // Bucket API traffic per key rather than per IP, so several bots
                // behind one NAT (or one Cloudflare egress) don't starve each
                // other. Hash it — the raw key must never reach Redis. Invalid
                // keys still get their own bucket, so a garbage-key flood stays
                // bounded. Per-key business quota is separate, enforced by the
                // api-key plugin's own rateLimit.
                const apiKey = c.req.header("x-api-key");
                if (apiKey) return `apikey:${createHash("sha256").update(apiKey).digest("hex").slice(0, 32)}`;
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
        role: "Public",
        // No credentials at all: opt out of the document-wide api-key scheme.
        security: [],
        description: "Welcome route for the API. This route is used to verify that the API is up and running.",
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
        role: "Public",
        // No credentials at all: opt out of the document-wide api-key scheme.
        security: [],
        description: "Fetches the current rules content.",
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
app.route("/analytics", analytics);
app.route("/manage", manage);
app.route("/user", user);
app.route("/upload", upload);
app.route("/api-keys", apiKeys);

// Path-item keys that are operations; the rest ($ref, parameters) must not be
// handed a `security` field.
const OPENAPI_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const;

// Marks the endpoints on the api-key denylist. They are not part of the public
// API — they authenticate with the dashboard's session cookie, so a key gets a
// 403 there no matter its scope. Derived from `isApiKeyAllowedPath` rather than
// declared per route, so it cannot drift from what the middleware enforces.
const SESSION_ONLY_BADGE = { name: "Session only", color: "#f97316" };

const PROD_SERVER = { url: "https://api.clashwithjpa.com", description: "Production Server" };
const DEV_SERVERS = [{ url: "http://localhost:3000", description: "Local Server" }, PROD_SERVER];

const INTERNAL_DOC_DESCRIPTION =
    "API Documentation for ClashWithJPA. This API is used by the frontend hosted at https://clashwithjpa.com. You can find better-auth reference at /api/auth/reference";
const PUBLIC_DOC_DESCRIPTION =
    "Public API for ClashWithJPA. Authenticate with an `x-api-key` header. Keys are issued from your dashboard at https://clashwithjpa.com/dashboard/api-keys, and each one carries its own scopes — the badge on an operation is the level it requires.";

const docDescription = config.NODE_ENV === "production" ? PUBLIC_DOC_DESCRIPTION : INTERNAL_DOC_DESCRIPTION;

const baseOpenAPIHandler = openAPIRouteHandler(app, {
    documentation: {
        info: {
            title: "ClashWithJPA API",
            version: "1.0.0",
            description: INTERNAL_DOC_DESCRIPTION,
        },
        servers: DEV_SERVERS,
        externalDocs: {
            url: "/api/auth/reference",
            description: "Better Auth Reference",
        },
    },
});

// In production the document is narrowed to exactly the surface an API key can
// reach — same `isApiKeyAllowedPath` the auth middleware enforces with, so the
// published docs can never advertise an endpoint a key would be refused on.
// Development keeps the full internal document, since that's what the SPA and
// the generated client are built against.
app.get("/openapi.json", async (c) => {
    const res = await baseOpenAPIHandler(c, async () => {});
    if (!res) return c.json({ success: false, error: "Failed to build the OpenAPI document" }, 500);

    const doc = (await res.json()) as {
        info: { description?: string };
        paths?: Record<string, Record<string, { security?: unknown[]; "x-badges"?: { name: string }[] }>>;
        servers?: unknown[];
        components?: Record<string, unknown>;
        security?: unknown[];
    };

    // Declared in development too, so Scalar offers the key input locally.
    // Both schemes are OpenAPI type `apiKey` — that covers any header, cookie or
    // query credential — and Scalar labels them "<scheme name> <type>". Naming
    // them after the credential itself keeps that readable; calling one `apiKey`
    // would render as "apiKey apiKey".
    doc.components = {
        ...(doc.components ?? {}),
        securitySchemes: {
            "x-api-key": { type: "apiKey", in: "header", name: "x-api-key" },
            session_token: { type: "apiKey", in: "cookie", name: "jpa.session_token" },
        },
    };
    doc.security = [{ "x-api-key": [] }];

    if (config.NODE_ENV === "production") {
        doc.info.description = PUBLIC_DOC_DESCRIPTION;
        doc.servers = [PROD_SERVER];
        doc.paths = Object.fromEntries(Object.entries(doc.paths ?? {}).filter(([path]) => isApiKeyAllowedPath(path)));
    }

    // Development still lists the endpoints a key is refused on. Point them at the
    // session cookie instead of the document-wide key scheme, so the lock reports
    // that credentials are needed and the badge says which kind.
    for (const [path, item] of Object.entries(doc.paths ?? {})) {
        if (isApiKeyAllowedPath(path)) continue;
        for (const method of OPENAPI_METHODS) {
            const operation = item[method];
            if (!operation) continue;
            // A route declaring `security: []` takes no credentials at all; leave it.
            if (operation.security?.length === 0) continue;
            operation.security = [{ session_token: [] }];
            const badges = operation["x-badges"] ?? [];
            operation["x-badges"] = [...badges.filter((b) => b.name !== SESSION_ONLY_BADGE.name), SESSION_ONLY_BADGE];
        }
    }

    return c.json(doc);
});

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
                // Reads /openapi.json, so the endpoint list is already narrowed
                // to the API-key surface in production — only the blurb needs to
                // match.
                description: docDescription,
                ogDescription: docDescription,
                ogTitle: "ClashWithJPA API Documentation",
            },
            telemetry: false,
        };
    }),
);

export default app;
