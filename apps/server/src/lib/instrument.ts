import { config } from "@/lib/config";
import * as Sentry from "@sentry/bun";

// Ensure to call this before importing any other modules!
Sentry.init({
    dsn: config.SENTRY_SPOTLIGHT === "1" ? undefined : config.SENTRY_DSN,
    spotlight: config.SENTRY_SPOTLIGHT === "1",
    sendDefaultPii: true,
    enableLogs: true,
    sampleRate: 1.0,
    tracesSampleRate: 1.0,
    debug: false,
});
