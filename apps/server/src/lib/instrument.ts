import { config } from "@/lib/config";
import * as Sentry from "@sentry/node";

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
    // Sentry's ESM loader hooks (import-in-the-middle) re-wrap module exports,
    // which loses the handler identity hono-openapi keys `describeRoute`
    // metadata off — /openapi.json builds with zero paths and Scalar renders an
    // empty page. Only ESM auto-instrumentation is given up; the HTTP
    // integration and error capture are unaffected.
    registerEsmLoaderHooks: false,
});
