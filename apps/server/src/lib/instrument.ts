import { config } from "@/lib/config";
import * as Sentry from "@sentry/node";

const isProd = config.NODE_ENV === "production";

const identityHeaders = { deny: ["forwarded", "-ip", "remote-", "via", "-user"] };

// Ensure to call this before importing any other modules!
Sentry.init({
    dsn: config.SENTRY_SPOTLIGHT === "1" ? undefined : config.SENTRY_DSN,
    spotlight: config.SENTRY_SPOTLIGHT === "1",
    sampleRate: isProd ? 0.2 : 1.0,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    // GlitchTip stores transactions but silently drops the spans v11 streams by default.
    traceLifecycle: "static",
    // v11 sends user info, cookies, bodies and query data unless told otherwise, so production keeps the restrictive v10 baseline.
    dataCollection: isProd
        ? {
              userInfo: false,
              cookies: false,
              httpHeaders: { request: identityHeaders, response: identityHeaders },
              httpBodies: [],
              urlQueryParams: identityHeaders,
              genAI: { inputs: false, outputs: false },
              databaseQueryData: false,
              queues: false,
              graphQL: { document: false, variables: false },
          }
        : undefined,
    debug: false,
});
