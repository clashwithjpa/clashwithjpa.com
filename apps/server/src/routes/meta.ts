import { metaPageHtml, type MetaCard } from "@/lib/card/page";
import { buildWarCard } from "@/lib/card/war";
import { describeRoute } from "@/lib/openapi";
import type { AppEnv } from "@/lib/types";
import { isFamilyClan, normalizeTag } from "@/lib/war-log";
import * as Sentry from "@sentry/node";
import { Hono, type Context } from "hono";
import { validator as zValidator } from "hono-openapi";
import z4 from "zod/v4";

// Link-preview pages for the web app's routes that aren't prerendered. The web server sends
// crawlers asking for /<path> to /meta/<path>, so each route here mirrors a site path and
// answers with a bare HTML page of meta tags and Discord's component embed. A 404 sends the
// crawler back to the SPA shell and its generic card.
const app = new Hono<AppEnv>();

// Crawlers re-fetch on their own schedule; a minute keeps a burst of shares off the database.
const CACHE = "public, max-age=60";

const respond = (c: Context<AppEnv>, card: MetaCard) => {
    c.header("Cache-Control", CACHE);
    return c.html(metaPageHtml(card));
};

const clanParamSchema = z4.object({ clan: z4.string().regex(/^#?[0-9A-Za-z]{3,15}$/, "Invalid clan tag") });
const warLogQuerySchema = z4.object({ war: z4.coerce.number().int().min(1).optional() });
app.get(
    "/wars/log/:clan",
    describeRoute({
        operationId: "getWarLogMeta",
        role: "Public",
        security: [],
        description: "Link-preview page for /wars/log/:clan (and ?war=), with the war card as Discord's component embed.",
        tags: ["meta"],
        // HTML for crawlers, which the generated JSON client has no use for.
        hide: true,
    }),
    zValidator("param", clanParamSchema),
    zValidator("query", warLogQuerySchema),
    async (c) => {
        const tag = normalizeTag(c.req.valid("param").clan);
        try {
            if (!(await isFamilyClan(tag))) return c.json({ success: false, error: "Not a family clan" }, 404);
            return respond(c, await buildWarCard(tag, c.req.valid("query").war));
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to build the war card" }, 500);
        }
    },
);

export default app;
