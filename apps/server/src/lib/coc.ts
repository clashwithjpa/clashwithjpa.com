import { Client } from "clashofclans.js";
import { CacheStore } from "clashofclans.js";
import * as Sentry from "@sentry/bun";

export const cocClient = new Client({
    baseURL: process.env.PUBLIC_COC_API_BASE_URI!,
    keys: [process.env.JPA_COC_API_TOKEN!],
    cache: new CacheStore({
        ttl: 2 * 60 * 1000, // 3 minutes
        sweepInterval: 3 * 60 * 1000, // 5 minutes
    }),
});

cocClient.on("error", (error: unknown) => {
    Sentry.captureException(error);
});
