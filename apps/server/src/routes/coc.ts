import { isAuthenticated } from "@/lib/auth/functions";
import { cocClient } from "@/lib/coc";
import { getClans, getClansWithRequirements, getCwlClans } from "@/lib/db/functions";
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
    tag: z4.string().min(1, "Player tag is required").max(20).startsWith("#", "Player tag must start with #"),
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
    tag: z4.string().min(1, "Player tag is required").max(20).startsWith("#", "Player tag must start with #"),
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
    tag: z4.string().min(1, "Player tag is required").max(20).startsWith("#", "Player tag must start with #"),
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
    tag: z4.string().min(1, "Clan tag is required").max(20).startsWith("#", "Clan tag must start with #"),
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
    tag: z4.string().min(1, "Clan tag is required").max(20).startsWith("#", "Clan tag must start with #"),
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
    tag: z4.string().min(1, "Clan tag is required").max(20).startsWith("#", "Clan tag must start with #"),
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
    tag: z4.string().min(1, "Clan tag is required").max(20).startsWith("#", "Clan tag must start with #"),
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
    warTag: z4.string().min(1, "War tag is required").max(20).startsWith("#", "War tag must start with #"),
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

const getJPAClanRequirementsData = z4.object({
    clans: z4.record(
        z4.string(),
        z4.object({
            requiredAttacks: z4.number().nullable(),
            requiredClangames: z4.number().nullable(),
            requiredDonations: z4.number().nullable(),
        }),
    ),
});
app.get(
    "/jpa/clans/requirements",
    describeRoute({
        operationId: "getJPAClanRequirements",
        description: "[Public] Fetches all JPA clans and their requirements.",
        tags: ["coc"],
        responses: {
            200: {
                description: "Successful response with the JPA clans.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getJPAClanRequirementsData)),
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
    async (c) => {
        try {
            const clans = await getClansWithRequirements();
            return c.json({
                success: true,
                data: { clans },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch JPA clans" }, 500);
        }
    },
);

const getJPAClansData = z4.object({
    clans: z4.record(
        z4.string(),
        z4.object({
            clanTag: z4.string(),
            clanCode: z4.string(),
            clanName: z4.string().nullable(),
            clanLevel: z4.number().nullable(),
            discord: z4.object({
                clanRoleId: z4.string(),
                clanChannelId: z4.string(),
                memberRoleId: z4.string(),
                elderRoleId: z4.string(),
                coleaderRoleId: z4.string(),
                leaderRoleId: z4.string(),
                leaderId: z4.string(),
            }),
            requirements: z4.object({
                attacks: z4.number(),
                donations: z4.number(),
                clangames: z4.number(),
            }),
        }),
    ),
});
app.get(
    "/jpa/clans",
    hasAccessAuthMiddleware(isAuthenticated),
    describeRoute({
        operationId: "getJPAClans",
        description: "[Authenticated] Fetches all JPA clans with their details and requirements.",
        tags: ["coc"],
        responses: {
            200: {
                description: "Successful response with the JPA clans.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getJPAClansData)),
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
    async (c) => {
        try {
            const clans = await getClans();
            return c.json({
                success: true,
                data: { clans },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch JPA clans" }, 500);
        }
    },
);

const getJPACwlClans = z4.object({
    clans: z4.record(
        z4.string(),
        z4.object({
            clanTag: z4.string(),
            clanName: z4.string(),
            clanLeague: z4.string(),
            clanLeader: z4.string(),
            email: z4.string(),
        }),
    ),
});
app.get(
    "/jpa/clans/cwl",
    hasAccessAuthMiddleware(isAuthenticated),
    describeRoute({
        operationId: "getJPACwlClans",
        description: "[Authenticated] Fetches all JPA CWL clans with their details.",
        tags: ["coc"],
        responses: {
            200: {
                description: "Successful response with the JPA CWL clans.",
                content: {
                    "application/json": {
                        schema: resolver(SuccessResponseSchema(getJPACwlClans)),
                    },
                },
            },
            500: {
                description: "Server error response when fetching JPA CWL clans fails.",
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
            const clans = await getCwlClans();
            return c.json({
                success: true,
                data: { clans },
            });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch JPA CWL clans" }, 500);
        }
    },
);

export default app;
