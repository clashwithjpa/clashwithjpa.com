import { PUBLIC_SENTRY_DSN, PUBLIC_SENTRY_SPOTLIGHT } from "$env/static/public";
import * as Sentry from "@sentry/sveltekit";
import type { HandleServerError } from "@sveltejs/kit";

Sentry.init({
    dsn: PUBLIC_SENTRY_SPOTLIGHT === "1" ? undefined : PUBLIC_SENTRY_DSN,
    spotlight: PUBLIC_SENTRY_SPOTLIGHT === "1",
    sampleRate: 1,
    tracesSampleRate: 1,
    enableLogs: true,
    sendDefaultPii: true,
    debug: false,
});

export const handleError: HandleServerError = async ({ error, event, status }) => {
    const errorId = crypto.randomUUID();

    Sentry.captureException(error, {
        extra: { event, errorId, status },
    });

    return {
        message: "Whoops!",
        errorId,
    };
};
