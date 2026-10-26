import { dev } from "$app/env";
import { PUBLIC_SENTRY_DSN, PUBLIC_SENTRY_SPOTLIGHT, PUBLIC_SERVER_URL } from "$app/env/public";
import { client } from "@repo/clashofclans-client";
import * as Sentry from "@sentry/sveltekit";
import type { ClientInit, HandleClientError } from "@sveltejs/kit/hooks";

const identityHeaders = { deny: ["forwarded", "-ip", "remote-", "via", "-user"] };

Sentry.init({
    dsn: PUBLIC_SENTRY_SPOTLIGHT ? undefined : PUBLIC_SENTRY_DSN,
    spotlight: PUBLIC_SENTRY_SPOTLIGHT,
    sampleRate: 1,
    tracesSampleRate: 1,
    // GlitchTip stores transactions but silently drops the spans v11 streams by default.
    traceLifecycle: "static",
    // v11 sends user info, cookies and request bodies unless told otherwise, so keep the restrictive v10 baseline outside dev.
    dataCollection: dev
        ? undefined
        : {
              userInfo: false,
              cookies: false,
              httpHeaders: { request: identityHeaders, response: identityHeaders },
              httpBodies: [],
              urlQueryParams: identityHeaders,
          },
    debug: false,
});

export const init: ClientInit = () => {
    client.setConfig({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
};

export const handleError: HandleClientError = ({ kind, error, event }) => {
    // `error(...)` calls and framework errors (404s and the like) are expected and safe to show as-is.
    if (kind === "app" || kind === "framework") return error;

    const errorId = crypto.randomUUID();
    Sentry.captureException(error, {
        extra: { errorId, route: event.route?.id ?? null, path: event.url?.pathname ?? null },
    });

    return { message: "Whoops!", errorId };
};
