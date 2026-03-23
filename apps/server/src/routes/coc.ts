import { isAuthenticated } from "@/lib/auth/functions";
import { cocClient } from "@/lib/coc";
import { getClansWithRequirements } from "@/lib/db/functions";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
import { ErrorResponseSchema, SuccessResponseSchema, type AppEnv } from "@/lib/types";
import {
    APIBattleLogEntryListSchema,
    APIClanMemberListSchema,
    APIClanSchema,
    APIClanWarLeagueGroupSchema,
    APIClanWarSchema,
    APIPlayerSchema,
    APIVerifyTokenSchema,
} from "@repo/clashofclans-api";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { describeRoute, resolver, validator as zValidator } from "hono-openapi";
import z4 from "zod/v4";

// All routes have /coc as a prefix
// For routes you need to have specific auth requirements add the middleware
const app = new Hono<AppEnv>();

const getCOCPlayerPathSchema = z4.object({
    tag: z4.string().min(1, "Player tag is required").startsWith("#", "Player tag must start with #"),
});
const getCOCPlayerData = z4.object({
    player: APIPlayerSchema,
});
app.get(
    "/player/:tag",
    hasAccessAuthMiddleware(isAuthenticated),
    describeRoute({
        operationId: "getCOCPlayer",
        description: "[Authenticated] Fetches a Clash of Clans player's data by their tag. The tag must start with #.",
        tags: ["coc"],
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
    zValidator("param", getCOCPlayerPathSchema),
    async (c) => {
        const tag = c.req.param("tag");
        try {
            const player = await cocClient.getPlayer(tag);
            return c.json({
                success: true,
                data: { player },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch player data" }, 500);
        }
    },
);

const postCOCPlayerVerifyPathSchema = z4.object({
    tag: z4.string().min(1, "Player tag is required").startsWith("#", "Player tag must start with #"),
});
const postCOCPlayerVerifyBodySchema = z4.object({
    apiToken: z4.string(),
});
const postCOCPlayerVerifyData = z4.object({
    verifyToken: APIVerifyTokenSchema,
});
app.post(
    "/player/:tag/verifytoken",
    hasAccessAuthMiddleware(isAuthenticated),
    describeRoute({
        operationId: "postCOCPlayerVerify",
        description: "[Authenticated] Verifies a Clash of Clans player's API token.",
        tags: ["coc"],
        responses: {
            200: {
                description: "Successful response with the verification token.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(postCOCPlayerVerifyData)),
                    },
                },
            },
            500: {
                description: "Server error response when verifying the API token fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    zValidator("param", postCOCPlayerVerifyPathSchema),
    zValidator("json", postCOCPlayerVerifyBodySchema),
    async (c) => {
        const tag = c.req.param("tag");
        const { apiToken } = await c.req.json();
        try {
            const verifyToken = await cocClient.verifyPlayerToken(tag, apiToken);
            return c.json({
                success: true,
                data: { verifyToken },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to verify API token" }, 500);
        }
    },
);

const getCOCPlayerBattleLogPathSchema = z4.object({
    tag: z4.string().min(1, "Player tag is required").startsWith("#", "Player tag must start with #"),
});
const getCOCPlayerBattleLogData = z4.object({
    battleLog: APIBattleLogEntryListSchema,
});
app.get(
    "/player/:tag/battlelog",
    hasAccessAuthMiddleware(isAuthenticated),
    describeRoute({
        operationId: "getCOCPlayerBattleLog",
        description: "[Authenticated] Fetches a Clash of Clans player's battle log by their tag. The tag must start with #.",
        tags: ["coc"],
        responses: {
            200: {
                description: "Successful response with the player's battle log.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getCOCPlayerBattleLogData)),
                    },
                },
            },
            500: {
                description: "Server error response when fetching battle log fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    zValidator("param", getCOCPlayerBattleLogPathSchema),
    async (c) => {
        const tag = c.req.param("tag");
        try {
            const battleLog = await cocClient.getPlayerBattleLog(tag);
            return c.json({
                success: true,
                data: { battleLog },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch player battle log" }, 500);
        }
    },
);

const getCOCClanPathSchema = z4.object({
    tag: z4.string().min(1, "Clan tag is required").startsWith("#", "Clan tag must start with #"),
});
const getCOCClanData = z4.object({
    clan: APIClanSchema,
});
app.get(
    "/clan/:tag",
    describeRoute({
        operationId: "getCOCClan",
        description: "[Public] Fetches a Clash of Clans clan's data by its tag. The tag must start with #.",
        tags: ["coc"],
        responses: {
            200: {
                description: "Successful response with the clan's data.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getCOCClanData)),
                    },
                },
            },
            500: {
                description: "Server error response when fetching clan data fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    zValidator("param", getCOCClanPathSchema),
    async (c) => {
        const tag = c.req.param("tag");
        try {
            const clan = await cocClient.getClan(tag);
            return c.json({
                success: true,
                data: { clan },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch clan data" }, 500);
        }
    },
);

const getCOCClanMembersPathSchema = z4.object({
    tag: z4.string().min(1, "Clan tag is required").startsWith("#", "Clan tag must start with #"),
});
const getCOCClanMembersData = z4.object({
    clanMembers: APIClanMemberListSchema,
});
app.get(
    "/clan/:tag/members",
    describeRoute({
        operationId: "getCOCClanMembers",
        description: "[Public] Fetches a Clash of Clans clan's members by its tag. The tag must start with #.",
        tags: ["coc"],
        responses: {
            200: {
                description: "Successful response with the clan's members.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getCOCClanMembersData)),
                    },
                },
            },
            500: {
                description: "Server error response when fetching clan members fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    zValidator("param", getCOCClanMembersPathSchema),
    async (c) => {
        const tag = c.req.param("tag");
        try {
            const clanMembers = await cocClient.getClanMembers(tag);
            return c.json({
                success: true,
                data: { clanMembers },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch clan members" }, 500);
        }
    },
);

const getCOCClanCurrentWarPathSchema = z4.object({
    tag: z4.string().min(1, "Clan tag is required").startsWith("#", "Clan tag must start with #"),
});
const getCOCClanCurrentWarData = z4.object({
    currentWar: APIClanWarSchema,
});
app.get(
    "/clan/:tag/currentwar",
    describeRoute({
        operationId: "getCOCClanCurrentWar",
        description: "[Public] Fetches a Clash of Clans clan's current war by its tag. The tag must start with #.",
        tags: ["coc"],
        responses: {
            200: {
                description: "Successful response with the clan's current war data.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getCOCClanCurrentWarData)),
                    },
                },
            },
            500: {
                description: "Server error response when fetching current war data fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    zValidator("param", getCOCClanCurrentWarPathSchema),
    async (c) => {
        const tag = c.req.param("tag");
        try {
            const currentWar = await cocClient.getCurrentWar(tag);
            return c.json({
                success: true,
                data: { currentWar },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch current war data" }, 500);
        }
    },
);

const getCOCClanCWLGroupPathSchema = z4.object({
    tag: z4.string().min(1, "Clan tag is required").startsWith("#", "Clan tag must start with #"),
});
const getCOCClanCWLGroupData = z4.object({
    leagueGroup: APIClanWarLeagueGroupSchema,
});
app.get(
    "/clan/:tag/currentwar/leaguegroup",
    hasAccessAuthMiddleware(isAuthenticated),
    describeRoute({
        operationId: "getCOCClanCWLGroup",
        description: "[Authenticated] Fetches a Clash of Clans clan's current CWL league group by its tag. The tag must start with #.",
        tags: ["coc"],
        responses: {
            200: {
                description: "Successful response with the clan's CWL league group data.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getCOCClanCWLGroupData)),
                    },
                },
            },
            500: {
                description: "Server error response when fetching CWL league group data fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    zValidator("param", getCOCClanCWLGroupPathSchema),
    async (c) => {
        const tag = c.req.param("tag");
        try {
            const leagueGroup = await cocClient.getCWLGroup(tag);
            return c.json({
                success: true,
                data: { leagueGroup },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL league group data" }, 500);
        }
    },
);

const getCOCCWLWarPathSchema = z4.object({
    warTag: z4.string().min(1, "War tag is required").startsWith("#", "War tag must start with #"),
});
const getCOCCWLWarData = z4.object({
    war: APIClanWarSchema,
});
app.get(
    "/cwl/wars/:warTag",
    hasAccessAuthMiddleware(isAuthenticated),
    describeRoute({
        operationId: "getCOCCWLWar",
        description: "[Authenticated] Fetches a CWL war's details by its war tag. The tag must start with #.",
        tags: ["coc"],
        responses: {
            200: {
                description: "Successful response with the CWL war data.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getCOCCWLWarData)),
                    },
                },
            },
            500: {
                description: "Server error response when fetching CWL war data fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    zValidator("param", getCOCCWLWarPathSchema),
    async (c) => {
        const warTag = c.req.param("warTag");
        try {
            const war = await cocClient.getCWLWar(warTag);
            return c.json({
                success: true,
                data: { war },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL war data" }, 500);
        }
    },
);

const getJPAClansDataQuerySchema = z4.object({
    extended: z4
        .enum(["true", "false"])
        .optional()
        .transform((v) => v === "true")
        .default(false),
});
const clanRequirementsSchema = z4.object({
    requiredAttacks: z4.number().nullable(),
    requiredClangames: z4.number().nullable(),
    requiredDonations: z4.number().nullable(),
});
const getJPAClansDataExtended = z4.object({
    clans: z4.record(z4.string(), clanRequirementsSchema.extend({ cocData: APIClanSchema.optional() })),
});
app.get(
    "/jpa/clans",
    describeRoute({
        operationId: "getJPAClans",
        description: "[Public] Fetches all JPA clans and their requirements.",
        tags: ["coc"],
        parameters: [
            {
                name: "extended",
                in: "query",
                required: false,
                description: "If true, also fetches full CoC clan data for each clan from the CoC API.",
                schema: { type: "string", enum: ["true", "false"], default: "false" },
            },
        ],
        responses: {
            200: {
                description: "Successful response with the JPA clans.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getJPAClansDataExtended)),
                    },
                },
            },
            500: {
                description: "Server error response when fetching JPA clans fails.",
                content: {
                    "application/json": {
                        schema: resolver(ErrorResponseSchema),
                    },
                },
            },
        },
    }),
    zValidator("query", getJPAClansDataQuerySchema),
    async (c) => {
        const { extended } = c.req.valid("query");
        try {
            const clans = await getClansWithRequirements();
            if (!extended) {
                return c.json({ success: true, data: { clans } });
            }
            const entries = await Promise.all(
                clans.map(async (clanRecord) => {
                    const rawTag = Object.keys(clanRecord)[0];
                    if (!rawTag) return null;
                    const tag: string = rawTag;
                    const clanData = clanRecord[tag]!;
                    try {
                        const cocData = await cocClient.getClan(tag);
                        return [tag, { ...clanData, cocData }] as const;
                    } catch {
                        return [tag, clanData] as const;
                    }
                }),
            );
            const clansDict = Object.fromEntries(entries.filter((e) => e !== null));
            return c.json({ success: true, data: { clans: clansDict } });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch JPA clans" }, 500);
        }
    },
);

export default app;
