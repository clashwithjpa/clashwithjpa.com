import "dotenv/config";
import * as Sentry from "@sentry/bun";
import { auth } from "@lib/auth";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { cors } from "hono/cors";

const app = new Hono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    };
}>().onError((err, c) => {
    Sentry.captureException(err);
    if (err instanceof HTTPException) {
        return err.getResponse();
    }
    // Or just report errors which are not instances of HTTPException
    // Sentry.captureException(err);
    return c.json({ error: "Internal server error" }, 500);
});

app.use(
    "*",
    cors({
        origin: [process.env.JPA_AUTH_URL!, process.env.JPA_APP_URL!],
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["POST", "GET", "OPTIONS"],
        exposeHeaders: ["Content-Length"],
        maxAge: 600,
        credentials: true,
    }),
);

app.use("*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        c.set("user", null);
        c.set("session", null);
        await next();
        return;
    }
    c.set("user", session.user);
    c.set("session", session.session);

    if (session?.user?.email) {
        Sentry.setUser({
            email: session.user.email,
            id: session.user.id,
        });
    }

    await next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
});

app.get("/", (c) => {
    return c.text("Hello Hono!");
});

app.get("/session", (c) => {
    const session = c.get("session");
    const user = c.get("user");

    if (!user) return c.body(null, 401);

    return c.json({
        session,
        user,
    });
});

app.get("/debug-sentry", () => {
    throw new Error("works!");
});

export default app;
