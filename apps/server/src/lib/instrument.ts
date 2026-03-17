import * as Sentry from "@sentry/node";
import { logger } from "./logger";
import type { LogEntry } from "winston";
import z from "zod";

// Ensure to call this before importing any other modules!
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/hono/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
    // Enable logs to be sent to Sentry
    enableLogs: true,
    sampleRate: 1.0,
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for tracing.
    // We recommend adjusting this value in production
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/guides/hono/configuration/options/#tracesSampleRate
    tracesSampleRate: 1.0,
});

const sentryLogLevelEnum = z.enum(["trace", "debug", "info", "warn", "error", "fatal"]);

logger.on("data", ({ message, level, ...rest }: LogEntry) => {
    const parsedLogLevel = sentryLogLevelEnum.safeParse(level);

    if (parsedLogLevel.success) {
        Sentry.logger[parsedLogLevel.data](message, rest);
    } else {
        Sentry.logger.trace(message, rest);
    }
});
