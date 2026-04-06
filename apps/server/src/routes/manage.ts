import { isManager } from "@/lib/auth/functions";
import { setRules } from "@/lib/db/functions";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
import { ErrorResponseSchema, SuccessResponseSchema, type AppEnv } from "@/lib/types";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import z4 from "zod/v4";

// All routes have /manage as a prefix
// All routes require manager-level auth
const app = new Hono<AppEnv>();

const setRulesBodySchema = z4.object({
    rules: z4.string().min(1, "Rules content is required"),
});
const setRulesData = z4.object({
    rules: z4.string(),
});
app.put(
    "/rules",
    hasAccessAuthMiddleware(isManager),
    describeRoute({
        operationId: "setRules",
        description: "[Manager] Updates the rules content.",
        tags: ["manage"],
        responses: {
            200: {
                description: "Successful response with the updated rules content.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(setRulesData)),
                    },
                },
            },
            500: {
                description: "Server error response when updating rules fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    zValidator("json", setRulesBodySchema),
    async (c) => {
        try {
            c.header("Cache-Control", "no-cache, no-store, must-revalidate");
            const { rules } = await c.req.json();
            const updatedRules = await setRules(rules);
            return c.json({
                success: true,
                data: { rules: updatedRules },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to update rules" }, 500);
        }
    },
);

export default app;
