/*
    This file handles communication to the Clash of Clans API. It is used to fetch data about players, clans, and other game-related information.
    The routes defined in this file will be used by the frontend to display relevant data to the users.
*/

import { Hono } from "hono";
import { cocClient } from "@/lib/coc";
import type { APIPlayer } from "clashofclans.js";
import { verifiedAuthMiddleware } from "@/lib/middlewares";
import * as Sentry from "@sentry/bun";
import z4, { success } from "zod/v4";
import { validator as zValidator, resolver, describeRoute } from "hono-openapi";
import { ApiResponseSchema, SuccessResponseSchema, ErrorResponseSchema } from "@/lib/types";

// All routes have /coc as a prefix
const app = new Hono();
app.use("/coc/*", verifiedAuthMiddleware);

const getCOCPlayerQuerySchema = z4.object({
    tag: z4.string().min(1, "Player tag is required").startsWith("#", "Player tag must start with #"),
});

const getCOCPlayerData = z4.object({
    player: z4.object({}),
});

app.get(
    "/coc/player/:tag",
    describeRoute({
        operationId: "getCOCPlayer",
        description: "Fetches a Clash of Clans player's data by their tag. The tag must start with #.",
        responses: {
            200: {
                description: "Successful response with the player's data.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getCOCPlayerData)),
                    },
                },
            },
            500: {
                description: "Server error response when fetching player data fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    zValidator("param", getCOCPlayerQuerySchema),
    async (c) => {
        const tag = c.req.param("tag");
        try {
            const player = await cocClient.getPlayer(tag);
            return c.json({
                success: true,
                data: player,
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch player data" }, 500);
        }
    },
);

export default app;
