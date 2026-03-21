import "dotenv/config";

function required(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export const config = {
    NODE_ENV: process.env.NODE_ENV ?? "development",

    // Database
    JPA_DATABASE_URL: required("JPA_DATABASE_URL"),

    // Auth
    JPA_AUTH_SECRET: required("JPA_AUTH_SECRET"),
    JPA_AUTH_URL: required("JPA_AUTH_URL"),
    JPA_APP_URL: required("JPA_APP_URL"),

    // Discord
    JPA_DISCORD_ID: required("JPA_DISCORD_ID"),
    JPA_DISCORD_SECRET: required("JPA_DISCORD_SECRET"),
    JPA_DISCORD_BOT_TOKEN: required("JPA_DISCORD_BOT_TOKEN"),

    // Clash of Clans
    PUBLIC_COC_API_BASE_URI: required("PUBLIC_COC_API_BASE_URI"),
    JPA_COC_API_TOKEN: required("JPA_COC_API_TOKEN"),

    // Cloudflare Turnstile
    JPA_TURNSTILE_SECRET_KEY: required("JPA_TURNSTILE_SECRET_KEY"),

    // Sentry (optional)
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_SPOTLIGHT: process.env.SENTRY_SPOTLIGHT,
} as const;
