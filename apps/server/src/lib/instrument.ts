import "dotenv/config";
import * as Sentry from "@sentry/bun";

// Ensure to call this before importing any other modules!
Sentry.init({
    dsn: process.env.SENTRY_SPOTLIGHT === "1" ? undefined : process.env.SENTRY_DSN,
    spotlight: process.env.SENTRY_SPOTLIGHT === "1",
    sendDefaultPii: true,
    enableLogs: true,
    sampleRate: 1.0,
    tracesSampleRate: 1.0,
    debug: false,
});
