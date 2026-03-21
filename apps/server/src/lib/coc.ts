import { ClashOfClansAPI } from "@repo/clashofclans-api";
import { config } from "@/lib/config";

/**
 * Shared Clash of Clans API client instance.
 * Uses environment variables for configuration.
 */
export const cocClient = new ClashOfClansAPI({
    baseUrl: config.PUBLIC_COC_API_BASE_URI,
    apiToken: config.JPA_COC_API_TOKEN,
    redisUrl: "redis://default@localhost:7102",
    cacheTTL: 120,
    rateLimit: {
        maxTokens: 30,
        refillRate: 30,
    },
});
