import { dev } from "$app/environment";
import { PUBLIC_SENTRY_DSN, PUBLIC_SENTRY_SPOTLIGHT } from "$env/static/public";
import * as Sentry from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit";

Sentry.init({
    dsn: PUBLIC_SENTRY_SPOTLIGHT === "1" ? undefined : PUBLIC_SENTRY_DSN,
    spotlight: PUBLIC_SENTRY_SPOTLIGHT === "1",
    sampleRate: 1,
    tracesSampleRate: 1,
    enableLogs: true,
    sendDefaultPii: dev,
    debug: false,
});

export const handleError: HandleClientError = async ({ error, event, status }) => {
    const errorId = crypto.randomUUID();

    Sentry.captureException(error, {
        extra: { errorId, status, route: event.route?.id ?? null, path: event.url?.pathname ?? null },
    });

    return {
        message: "Whoops!",
        errorId,
    };
};
