import RedisClient from "ioredis";
import { RedisCache } from "./cache";
import { RateLimiter } from "./rate-limiter";
import type {
    APIClan,
    APIClanList,
    APIClanMemberList,
    APIClanWar,
    APIClanWarLogList,
    APIClanWarLeagueGroup,
    APICapitalRaidSeasons,
    APIPlayer,
    APIVerifyToken,
    APIBattleLogEntryList,
    APILeagueTierList,
    APIWarLeagueList,
    APICapitalLeagueList,
    APIBuilderBaseLeagueList,
    APILeagueSeasonList,
    APIPlayerSeasonRankingList,
    APILocationList,
    APILocation,
    APIClanRankingList,
    APIPlayerRankingList,
    APIClanBuilderBaseRankingList,
    APIPlayerBuilderBaseRankingList,
    APIClanCapitalRankingList,
    APILabelList,
    APIGoldPassSeason,
} from "./types";

export interface ClashOfClansAPIConfig {
    /** Base URL for the CoC API (e.g. from PUBLIC_COC_API_BASE_URI) */
    baseUrl: string;

    /** Bearer token for API authentication (e.g. from JPA_COC_API_TOKEN) */
    apiToken: string;

    /** Redis connection URI (e.g. "redis://default@localhost:7102") */
    redisUrl: string;

    /** Rate limiter options */
    rateLimit?: {
        /** Max burst capacity (default: 30) */
        maxTokens?: number;
        /** Tokens refilled per second (default: 30) */
        refillRate?: number;
    };

    /** Default cache TTL in seconds for GET requests (default: 120) */
    cacheTTL?: number;
}

export class ClashOfClansAPI {
    private baseUrl: string;
    private apiToken: string;
    private cache: RedisCache;
    private rateLimiter: RateLimiter;
    private cacheTTL: number;
    private redis: RedisClient;

    constructor(config: ClashOfClansAPIConfig) {
        this.baseUrl = config.baseUrl.replace(/\/+$/, "");
        this.apiToken = config.apiToken;
        this.cacheTTL = config.cacheTTL ?? 120;

        this.redis = new RedisClient(config.redisUrl);
        this.cache = new RedisCache(this.redis);
        this.rateLimiter = new RateLimiter(config.rateLimit);
    }

    /**
     * Encode a Clash of Clans tag for use in URL paths.
     * `#` is replaced with `%23`.
     */
    private encodeTag(tag: string): string {
        return encodeURIComponent(tag);
    }

    /**
     * Internal request method that handles caching, rate limiting, and fetching.
     *
     * - GET requests check Redis cache first and store results on success.
     * - All requests pass through the rate limiter before hitting the API.
     */
    private async request<T>(
        method: "GET" | "POST",
        path: string,
        options?: {
            query?: Record<string, string>;
            body?: unknown;
            cacheTTL?: number;
        },
    ): Promise<T> {
        const query = options?.query;
        const ttl = options?.cacheTTL ?? this.cacheTTL;

        // For GET requests, check cache first
        if (method === "GET") {
            const cached = await this.cache.get<T>(path, query);
            if (cached !== null) {
                return cached;
            }
        }

        // Wait for rate limiter token
        await this.rateLimiter.acquire();

        // Build the full URL
        let url = `${this.baseUrl}${path}`;
        if (query && Object.keys(query).length > 0) {
            const params = new URLSearchParams(query);
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${this.apiToken}`,
                Accept: "application/json",
                ...(options?.body ? { "Content-Type": "application/json" } : {}),
            },
            ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "Unknown error");
            throw new ClashAPIError(response.status, errorBody, path);
        }

        const data = (await response.json()) as T;

        // Cache GET responses
        if (method === "GET") {
            await this.cache.set(path, data, ttl, query);
        }

        return data;
    }

    // **************** CLANS **************** //

    /**
     * Search clans by name and/or filtering criteria.
     * GET /v1/clans
     */
    async searchClans(query: {
        name?: string;
        warFrequency?: string;
        locationId?: number;
        minMembers?: number;
        maxMembers?: number;
        minClanPoints?: number;
        minClanLevel?: number;
        limit?: number;
        after?: string;
        before?: string;
    }): Promise<APIClanList> {
        const params: Record<string, string> = {};
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined) params[key] = String(value);
        }
        return this.request<APIClanList>("GET", "/v1/clans", { query: params });
    }

    /**
     * Get information about a single clan by tag.
     * GET /v1/clans/{clanTag}
     */
    async getClan(clanTag: string): Promise<APIClan> {
        return this.request<APIClan>("GET", `/v1/clans/${this.encodeTag(clanTag)}`);
    }

    /**
     * List clan members.
     * GET /v1/clans/{clanTag}/members
     */
    async getClanMembers(clanTag: string, query?: { limit?: number; after?: string; before?: string }): Promise<APIClanMemberList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APIClanMemberList>("GET", `/v1/clans/${this.encodeTag(clanTag)}/members`, { query: params });
    }

    /**
     * Retrieve clan's war log.
     * GET /v1/clans/{clanTag}/warlog
     */
    async getClanWarLog(clanTag: string, query?: { limit?: number; after?: string; before?: string }): Promise<APIClanWarLogList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APIClanWarLogList>("GET", `/v1/clans/${this.encodeTag(clanTag)}/warlog`, { query: params });
    }

    /**
     * Get current war information.
     * GET /v1/clans/{clanTag}/currentwar
     */
    async getCurrentWar(clanTag: string): Promise<APIClanWar> {
        return this.request<APIClanWar>("GET", `/v1/clans/${this.encodeTag(clanTag)}/currentwar`);
    }

    /**
     * Get information about clan's current CWL group.
     * GET /v1/clans/{clanTag}/currentwar/leaguegroup
     */
    async getCWLGroup(clanTag: string): Promise<APIClanWarLeagueGroup> {
        return this.request<APIClanWarLeagueGroup>("GET", `/v1/clans/${this.encodeTag(clanTag)}/currentwar/leaguegroup`);
    }

    /**
     * Get CWL war details by war tag.
     * GET /v1/clanwarleagues/wars/{warTag}
     */
    async getCWLWar(warTag: string): Promise<APIClanWar> {
        return this.request<APIClanWar>("GET", `/v1/clanwarleagues/wars/${this.encodeTag(warTag)}`);
    }

    /**
     * Get clan's capital raid seasons.
     * GET /v1/clans/{clanTag}/capitalraidseasons
     */
    async getCapitalRaidSeasons(clanTag: string, query?: { limit?: number; after?: string; before?: string }): Promise<APICapitalRaidSeasons> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APICapitalRaidSeasons>("GET", `/v1/clans/${this.encodeTag(clanTag)}/capitalraidseasons`, {
            query: params,
        });
    }

    // *************** PLAYERS *************** //

    /**
     * Get player information by tag.
     * GET /v1/players/{playerTag}
     */
    async getPlayer(playerTag: string): Promise<APIPlayer> {
        return this.request<APIPlayer>("GET", `/v1/players/${this.encodeTag(playerTag)}`);
    }

    /**
     * Verify a player API token.
     * POST /v1/players/{playerTag}/verifytoken
     *
     * Note: POST requests are NOT cached.
     */
    async verifyPlayerToken(playerTag: string, token: string): Promise<APIVerifyToken> {
        return this.request<APIVerifyToken>("POST", `/v1/players/${this.encodeTag(playerTag)}/verifytoken`, {
            body: { token },
        });
    }

    /**
     * Get player battle log.
     * GET /v1/players/{playerTag}/battlelog
     */
    async getPlayerBattleLog(playerTag: string): Promise<APIBattleLogEntryList> {
        return this.request<APIBattleLogEntryList>("GET", `/v1/players/${this.encodeTag(playerTag)}/battlelog`);
    }

    // *************** LEAGUES *************** //

    /**
     * Get list of league tiers.
     * GET /v1/leaguetiers
     */
    async getLeagueTiers(query?: { limit?: number; after?: string; before?: string }): Promise<APILeagueTierList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APILeagueTierList>("GET", "/v1/leaguetiers", { query: params });
    }

    /**
     * Get league seasons.
     * GET /v1/leagues/{leagueId}/seasons
     */
    async getLeagueSeasons(leagueId: number, query?: { limit?: number; after?: string; before?: string }): Promise<APILeagueSeasonList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APILeagueSeasonList>("GET", `/v1/leagues/${leagueId}/seasons`, { query: params });
    }

    /**
     * Get league season rankings.
     * GET /v1/leagues/{leagueId}/seasons/{seasonId}
     */
    async getLeagueSeasonRankings(
        leagueId: number,
        seasonId: string,
        query?: { limit?: number; after?: string; before?: string },
    ): Promise<APIPlayerSeasonRankingList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APIPlayerSeasonRankingList>("GET", `/v1/leagues/${leagueId}/seasons/${seasonId}`, {
            query: params,
        });
    }

    /**
     * Get list of war leagues.
     * GET /v1/warleagues
     */
    async getWarLeagues(query?: { limit?: number; after?: string; before?: string }): Promise<APIWarLeagueList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APIWarLeagueList>("GET", "/v1/warleagues", { query: params });
    }

    /**
     * Get list of capital leagues.
     * GET /v1/capitalleagues
     */
    async getCapitalLeagues(query?: { limit?: number; after?: string; before?: string }): Promise<APICapitalLeagueList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APICapitalLeagueList>("GET", "/v1/capitalleagues", { query: params });
    }

    /**
     * Get list of builder base leagues.
     * GET /v1/builderbaseleagues
     */
    async getBuilderBaseLeagues(query?: { limit?: number; after?: string; before?: string }): Promise<APIBuilderBaseLeagueList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APIBuilderBaseLeagueList>("GET", "/v1/builderbaseleagues", { query: params });
    }

    // ************* LOCATIONS ************* //

    /**
     * Get list of locations.
     * GET /v1/locations
     */
    async getLocations(query?: { limit?: number; after?: string; before?: string }): Promise<APILocationList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APILocationList>("GET", "/v1/locations", { query: params });
    }

    /**
     * Get information about a specific location.
     * GET /v1/locations/{locationId}
     */
    async getLocation(locationId: number): Promise<APILocation> {
        return this.request<APILocation>("GET", `/v1/locations/${locationId}`);
    }

    /**
     * Get clan rankings for a specific location.
     * GET /v1/locations/{locationId}/rankings/clans
     */
    async getClanRankings(locationId: number, query?: { limit?: number; after?: string; before?: string }): Promise<APIClanRankingList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APIClanRankingList>("GET", `/v1/locations/${locationId}/rankings/clans`, { query: params });
    }

    /**
     * Get player rankings for a specific location.
     * GET /v1/locations/{locationId}/rankings/players
     */
    async getPlayerRankings(locationId: number, query?: { limit?: number; after?: string; before?: string }): Promise<APIPlayerRankingList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APIPlayerRankingList>("GET", `/v1/locations/${locationId}/rankings/players`, {
            query: params,
        });
    }

    /**
     * Get clan builder base rankings for a specific location.
     * GET /v1/locations/{locationId}/rankings/clans-builder-base
     */
    async getClanBuilderBaseRankings(
        locationId: number,
        query?: { limit?: number; after?: string; before?: string },
    ): Promise<APIClanBuilderBaseRankingList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APIClanBuilderBaseRankingList>("GET", `/v1/locations/${locationId}/rankings/clans-builder-base`, { query: params });
    }

    /**
     * Get player builder base rankings for a specific location.
     * GET /v1/locations/{locationId}/rankings/players-builder-base
     */
    async getPlayerBuilderBaseRankings(
        locationId: number,
        query?: { limit?: number; after?: string; before?: string },
    ): Promise<APIPlayerBuilderBaseRankingList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APIPlayerBuilderBaseRankingList>("GET", `/v1/locations/${locationId}/rankings/players-builder-base`, { query: params });
    }

    /**
     * Get capital rankings for a specific location.
     * GET /v1/locations/{locationId}/rankings/capitals
     */
    async getCapitalRankings(locationId: number, query?: { limit?: number; after?: string; before?: string }): Promise<APIClanCapitalRankingList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APIClanCapitalRankingList>("GET", `/v1/locations/${locationId}/rankings/capitals`, {
            query: params,
        });
    }

    // ************** LABELS ************** //

    /**
     * Get list of clan labels.
     * GET /v1/labels/clans
     */
    async getClanLabels(query?: { limit?: number; after?: string; before?: string }): Promise<APILabelList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APILabelList>("GET", "/v1/labels/clans", { query: params });
    }

    /**
     * Get list of player labels.
     * GET /v1/labels/players
     */
    async getPlayerLabels(query?: { limit?: number; after?: string; before?: string }): Promise<APILabelList> {
        const params: Record<string, string> = {};
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined) params[key] = String(value);
            }
        }
        return this.request<APILabelList>("GET", "/v1/labels/players", { query: params });
    }

    // *********** GOLD PASS *********** //

    /**
     * Get current gold pass season.
     * GET /v1/goldpass/seasons/current
     */
    async getGoldPassSeason(): Promise<APIGoldPassSeason> {
        return this.request<APIGoldPassSeason>("GET", "/v1/goldpass/seasons/current");
    }

    // *********** LIFECYCLE *********** //

    /**
     * Disconnect Redis and clean up rate limiter timers.
     * Call this when shutting down the application.
     */
    async destroy(): Promise<void> {
        this.rateLimiter.destroy();
        await this.redis.quit();
    }
}

/**
 * Structured error for CoC API failures.
 */
export class ClashAPIError extends Error {
    public status: number;
    public body: string;
    public path: string;

    constructor(status: number, body: string, path: string) {
        super(`CoC API error ${status} on ${path}: ${body}`);
        this.name = "ClashAPIError";
        this.status = status;
        this.body = body;
        this.path = path;
    }
}
