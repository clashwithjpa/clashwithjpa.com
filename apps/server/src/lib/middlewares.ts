import * as Sentry from "@sentry/bun";
import { createMiddleware } from "hono/factory";
import { auth } from "@lib/auth";
import { isAuthenticated } from "@/lib/auth/functions";

export const betterAuthMiddleware = createMiddleware(async (c, next) => {
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

type AuthCheckFn = (userId: string) => Promise<{ success: boolean }>;

export const hasAccessAuthMiddleware = (checkFn: AuthCheckFn = isAuthenticated) =>
    createMiddleware(async (c, next) => {
        const user = c.get("user");
        const session = c.get("session");

        if (!user || !session) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        const authResult = await checkFn(user.id);
        if (!authResult.success) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        await next();
    });
