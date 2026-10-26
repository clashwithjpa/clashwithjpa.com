import { dev } from "$app/env";
import { PUBLIC_SENTRY_DSN, PUBLIC_SENTRY_SPOTLIGHT } from "$app/env/public";
import * as Sentry from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit/hooks";

Sentry.init({
    dsn: PUBLIC_SENTRY_SPOTLIGHT ? undefined : PUBLIC_SENTRY_DSN,
    spotlight: PUBLIC_SENTRY_SPOTLIGHT,
    sampleRate: 1,
    tracesSampleRate: 1,
    enableLogs: true,
    sendDefaultPii: dev,
    debug: false,
});

export const handleError: HandleClientError = ({ kind, error, event }) => {
    // `error(...)` calls and framework errors (404s and the like) are expected and safe to show as-is.
    if (kind === "app" || kind === "framework") return error;

    const errorId = crypto.randomUUID();
    Sentry.captureException(error, {
        extra: { errorId, route: event.route?.id ?? null, path: event.url?.pathname ?? null },
    });

    return { message: "Whoops!", errorId };
};
