import { describeRoute } from "@/lib/openapi";
import { ErrorResponseSchema, SuccessResponseSchema, type AppEnv } from "@/lib/types";
import {
    ensureBackfill,
    getLastChecked,
    getLatestWarDetail,
    getPlayerWarStats,
    getWarDetail,
    getWarLogClans,
    isFamilyClan,
    listClanWars,
    normalizeTag,
    warEvents,
} from "@/lib/war-log";
import * as Sentry from "@sentry/node";
import { Hono } from "hono";
import { resolver, validator as zValidator } from "hono-openapi";
import { streamSSE } from "hono/streaming";
import z4 from "zod/v4";

const app = new Hono<AppEnv>();

const WarSummarySchema = z4.object({
    id: z4.number(),
    clanTag: z4.string(),
    state: z4.string(),
    result: z4.string().nullable(),
    source: z4.string(),
    teamSize: z4.number(),
    attacksPerMember: z4.number(),
    preparationStartTime: z4.string().nullable(),
    startTime: z4.string().nullable(),
    endTime: z4.string(),
    opponentTag: z4.string().nullable(),
    opponentName: z4.string().nullable(),
    opponentBadge: z4.string().nullable(),
    clanStars: z4.number(),
    clanDestruction: z4.number(),
    clanAttacks: z4.number(),
    opponentStars: z4.number(),
    opponentDestruction: z4.number(),
    opponentAttacks: z4.number(),
    hasDetail: z4.boolean(),
    tracked: z4.boolean(),
});

const WarMemberSchema = z4.object({
    tag: z4.string(),
    name: z4.string(),
    th: z4.number(),
    pos: z4.number(),
    attacks: z4.number(),
    stars: z4.number(),
    newStars: z4.number(),
    destruction: z4.number(),
    defenses: z4.number(),
    bestDefense: z4.object({ stars: z4.number(), destruction: z4.number() }).nullable(),
});

const WarAttackSchema = z4.object({
    order: z4.number(),
    side: z4.enum(["clan", "opponent"]),
    attackerTag: z4.string(),
    defenderTag: z4.string(),
    attackerPos: z4.number(),
    defenderPos: z4.number(),
    attackerTh: z4.number(),
    defenderTh: z4.number(),
    attackNo: z4.number(),
    stars: z4.number(),
    newStars: z4.number(),
    destruction: z4.number(),
    duration: z4.number(),
    fresh: z4.boolean(),
    seenAt: z4.string().nullable(),
});

const WarSideSchema = z4.object({
    tag: z4.string().nullable(),
    name: z4.string().nullable(),
    badge: z4.string().nullable(),
    stars: z4.number(),
    destruction: z4.number(),
    attacks: z4.number(),
    members: z4.array(WarMemberSchema),
});

export const WarDetailSchema = z4.object({
    id: z4.number(),
    clanTag: z4.string(),
    state: z4.string(),
    result: z4.string().nullable(),
    source: z4.string(),
    teamSize: z4.number(),
    attacksPerMember: z4.number(),
    battleModifier: z4.string().nullable(),
    preparationStartTime: z4.string().nullable(),
    startTime: z4.string().nullable(),
    endTime: z4.string(),
    trackedSince: z4.string().nullable(),
    updatedAt: z4.string(),
    hasDetail: z4.boolean(),
    clan: WarSideSchema,
    opponent: WarSideSchema,
    attacks: z4.array(WarAttackSchema),
});

const PlayerWarStatsSchema = z4.object({
    tag: z4.string(),
    name: z4.string(),
    th: z4.number(),
    wars: z4.number(),
    attacksUsed: z4.number(),
    attacksAvailable: z4.number(),
    missed: z4.number(),
    missedStreak: z4.number(),
    stars: z4.number(),
    newStars: z4.number(),
    triples: z4.number(),
    zeroes: z4.number(),
    avgDestruction: z4.number(),
    mirrorFirst: z4.number(),
    firstAttacks: z4.number(),
    defenses: z4.number(),
    triplesConceded: z4.number(),
    recent: z4.array(z4.number().nullable()),
});

const errorResponses = {
    404: { description: "Not a family clan, or no such war.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
    500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
};

const tagParamSchema = z4.object({
    tag: z4.string().min(1, "Clan tag is required").max(20).startsWith("#", "Clan tag must start with #"),
});

const notFamily = { success: false as const, error: "Not a family clan" };

app.get(
    "/clans",
    describeRoute({
        operationId: "getWarLogClans",
        role: "Public",
        security: [],
        description: "Lists the family clans with their latest recorded war, for the war log's clan picker.",
        tags: ["war-log"],
        responses: {
            200: {
                description: "Family clans and their latest war.",
                content: {
                    "application/json": {
                        schema: resolver(
                            SuccessResponseSchema(
                                z4.object({
                                    clans: z4.array(
                                        z4.object({
                                            tag: z4.string(),
                                            code: z4.string(),
                                            name: z4.string().nullable(),
                                            badge: z4.string().nullable(),
                                            war: WarSummarySchema.nullable(),
                                        }),
                                    ),
                                }),
                            ),
                        ),
                    },
                },
            },
            ...errorResponses,
        },
    }),
    async (c) => {
        try {
            const clans = await getWarLogClans();
            return c.json({ success: true, data: { clans } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch war log clans" }, 500);
        }
    },
);

const listWarsQuerySchema = z4.object({
    limit: z4.coerce.number().int().min(1).max(100).default(40),
    before: z4.coerce.number().int().optional(),
});
app.get(
    "/:tag/wars",
    describeRoute({
        operationId: "getWarLogWars",
        role: "Public",
        security: [],
        description:
            "Lists a family clan's wars, newest first. The first call in a while backfills history from ClashKing (full wars) and the public war log (totals only).",
        tags: ["war-log"],
        responses: {
            200: {
                description: "A page of wars.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(z4.object({ wars: z4.array(WarSummarySchema), hasMore: z4.boolean() }))),
                    },
                },
            },
            ...errorResponses,
        },
    }),
    zValidator("param", tagParamSchema),
    zValidator("query", listWarsQuerySchema),
    async (c) => {
        const tag = normalizeTag(c.req.valid("param").tag);
        try {
            if (!(await isFamilyClan(tag))) return c.json(notFamily, 404);
            const query = c.req.valid("query");
            if (!query.before) await ensureBackfill(tag);
            const data = await listClanWars(tag, query);
            return c.json({ success: true, data });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch wars" }, 500);
        }
    },
);

const warParamSchema = tagParamSchema.extend({ id: z4.coerce.number().int().min(1) });
app.get(
    "/:tag/wars/:id",
    describeRoute({
        operationId: "getWarLogWar",
        role: "Public",
        security: [],
        description:
            "Fetches one stored war with both lineups ranked, every attack replayed in order, and each hit's seen time where the tracker caught it.",
        tags: ["war-log"],
        responses: {
            200: {
                description: "The war.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(z4.object({ war: WarDetailSchema }))) } },
            },
            ...errorResponses,
        },
    }),
    zValidator("param", warParamSchema),
    async (c) => {
        const { tag, id } = c.req.valid("param");
        try {
            const war = await getWarDetail(tag, id);
            if (!war) return c.json({ success: false, error: "War not found" }, 404);
            return c.json({ success: true, data: { war } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch war" }, 500);
        }
    },
);

const playersQuerySchema = z4.object({
    wars: z4.coerce.number().int().min(1).max(60).default(20),
});
app.get(
    "/:tag/players",
    describeRoute({
        operationId: "getWarLogPlayers",
        role: "Public",
        security: [],
        description: "Per-player attack, star, missed-attack and mirror totals over the clan's last finished wars that have full detail.",
        tags: ["war-log"],
        responses: {
            200: {
                description: "Player totals and the wars they cover, newest first.",
                content: {
                    "application/json": {
                        schema: resolver(
                            SuccessResponseSchema(
                                z4.object({
                                    wars: z4.array(z4.object({ id: z4.number(), endTime: z4.string() })),
                                    players: z4.array(PlayerWarStatsSchema),
                                }),
                            ),
                        ),
                    },
                },
            },
            ...errorResponses,
        },
    }),
    zValidator("param", tagParamSchema),
    zValidator("query", playersQuerySchema),
    async (c) => {
        const tag = normalizeTag(c.req.valid("param").tag);
        try {
            if (!(await isFamilyClan(tag))) return c.json(notFamily, 404);
            const data = await getPlayerWarStats(tag, c.req.valid("query").wars);
            return c.json({ success: true, data });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch player stats" }, 500);
        }
    },
);

app.get(
    "/:tag/live",
    describeRoute({
        operationId: "getWarLogLive",
        role: "Public",
        security: [],
        description:
            "Server-sent events for a clan's latest war. Sends `war` (the full war, or null) on connect and whenever the tracker records a change, `checked` after each poll, and `ping` as a keepalive.",
        tags: ["war-log"],
        // An event stream, which the generated JSON client can't consume.
        hide: true,
    }),
    zValidator("param", tagParamSchema),
    async (c) => {
        const tag = normalizeTag(c.req.valid("param").tag);
        if (!(await isFamilyClan(tag))) return c.json(notFamily, 404);

        return streamSSE(c, async (stream) => {
            // Writes go through one chain so a burst of updates can't interleave frames.
            let queue = Promise.resolve();
            const send = (event: string, build: () => Promise<unknown> | unknown) => {
                queue = queue
                    .then(async () => {
                        if (stream.aborted) return;
                        await stream.writeSSE({ event, data: JSON.stringify(await build()) });
                    })
                    .catch((error) => {
                        Sentry.captureException(error);
                    });
            };
            const checkedAt = () => getLastChecked(tag)?.toISOString() ?? null;
            const sendWar = () => send("war", async () => ({ war: await getLatestWarDetail(tag), checkedAt: checkedAt() }));

            const onUpdate = (t: string) => t === tag && sendWar();
            const onChecked = (t: string) => t === tag && send("checked", () => ({ checkedAt: checkedAt() }));
            warEvents.on("update", onUpdate);
            warEvents.on("checked", onChecked);
            stream.onAbort(() => {
                warEvents.off("update", onUpdate);
                warEvents.off("checked", onChecked);
            });

            sendWar();
            while (!stream.aborted) {
                await stream.sleep(25_000);
                send("ping", () => ({}));
            }
        });
    },
);

export default app;
