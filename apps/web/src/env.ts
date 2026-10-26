import { defineEnvVars } from "@sveltejs/kit/env";

// Static so they're inlined at build time: this is a prerendered SPA with no server to read them at runtime.
export const variables = defineEnvVars({
    PUBLIC_SERVER_URL: {
        public: true,
        static: true,
        description: "Origin of the API server, e.g. http://localhost:3000",
        schema: (value) => {
            if (!value || !URL.canParse(value)) throw new Error("PUBLIC_SERVER_URL must be an absolute URL");
            return value.replace(/\/$/, "");
        },
    },
    PUBLIC_SENTRY_DSN: {
        public: true,
        static: true,
        description: "Browser Sentry DSN. Leave empty to disable reporting",
        schema: (value) => value || undefined,
    },
    PUBLIC_SENTRY_SPOTLIGHT: {
        public: true,
        static: true,
        description: "Set to 1 to send Sentry events to a local Spotlight instead of the DSN",
        schema: (value) => value === "1",
    },
    PUBLIC_TURNSTILE_SITE_KEY: {
        public: true,
        static: true,
        description: "Cloudflare Turnstile site key for the apply form",
        schema: (value) => value ?? "",
    },
});
