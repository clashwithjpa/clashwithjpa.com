import { config } from "@/lib/config";
import * as Sentry from "@sentry/bun";

const isProd = config.NODE_ENV === "production";

// Ensure to call this before importing any other modules!
Sentry.init({
    dsn: config.SENTRY_SPOTLIGHT === "1" ? undefined : config.SENTRY_DSN,
    spotlight: config.SENTRY_SPOTLIGHT === "1",
    sendDefaultPii: !isProd,
    enableLogs: true,
    sampleRate: isProd ? 0.2 : 1.0,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    debug: false,
});
