import { isAdmin } from "@/lib/auth/functions";
import { getDiscordAccountId } from "@/lib/db/functions";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
import { ErrorResponseSchema, SuccessResponseSchema, type AppEnv } from "@/lib/types";
import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import z4 from "zod/v4";

// All routes have /admin as a prefix
// All routes require manager-level auth
const app = new Hono<AppEnv>();

const getDiscordIdPathSchema = z4.object({
    userid: z4.string().min(1, "userid is required"),
});
const getDiscordIdData = z4.object({
    accountId: z4.string(),
});
app.get(
    "/discord-id/:userid",
    hasAccessAuthMiddleware(isAdmin),
    describeRoute({
        operationId: "getDiscordIdByUserId",
        description: "[Admin] Fetches the Discord accountId from Better Auth account table using a userid path param.",
        tags: ["admin"],
        responses: {
            200: {
                description: "Successful response with the Discord accountId.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getDiscordIdData)),
                    },
                },
            },
            400: {
                description: "Bad request when userid path param is missing or invalid.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
            404: {
                description: "No Discord account found for the given userId.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
            500: {
                description: "Server error response when fetching Discord accountId fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
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

export default app;
