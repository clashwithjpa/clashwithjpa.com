import { Redis } from "ioredis";
import { config } from "@/lib/config";
import { getSettings } from "@/lib/db/functions";

const redis = new Redis(config.JPA_REDIS_URL);
const CACHE_KEY = "settings:cache";
const TTL_SECONDS = 30;

type CachedSettings = {
    id: number;
    applicationsEnabled: boolean;
    cwlEnabled: boolean;
    siteMaintenanceMode: boolean;
    rulesContent: string | null;
    guildId: string | null;
    currentCwlSeasonId: number | null;
    updatedAt: Date | null;
} | null;

let cachedSettings: CachedSettings = null;
let cacheTimestamp = 0;

function reviveSettings(raw: string): CachedSettings {
    const parsed = JSON.parse(raw) as CachedSettings;
    if (parsed?.updatedAt) {
        parsed.updatedAt = new Date(parsed.updatedAt as unknown as string);
    }
    return parsed;
}

export async function getCachedSettings(): Promise<CachedSettings> {
    const now = Date.now();
    if (cachedSettings && now - cacheTimestamp < TTL_SECONDS * 1000) {
        return cachedSettings;
    }

    try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
            cachedSettings = reviveSettings(cached);
            cacheTimestamp = now;
            return cachedSettings;
        }
    } catch (error) {
        console.error("Failed to read settings from Redis:", error);
    }

    const settings = await getSettings();
    cachedSettings = settings;
    cacheTimestamp = now;

    try {
        await redis.setex(CACHE_KEY, TTL_SECONDS, JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to write settings to Redis:", error);
    }

    return settings;
}

export async function invalidateSettingsCache(): Promise<void> {
    cachedSettings = null;
    cacheTimestamp = 0;
    try {
        await redis.del(CACHE_KEY);
    } catch (error) {
        console.error("Failed to invalidate settings cache:", error);
    }
}
