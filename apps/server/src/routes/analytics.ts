import { isReviewer } from "@/lib/auth/functions";
import {
    getAdminOverview,
    getAuditCategories,
    getAuditTrend,
    getCwlAssignmentStats,
    getCwlParticipationStats,
    getCwlSeasonOverview,
    getCwlSeasons,
    getTopAdminActivity,
    getUserJoinTrend,
} from "@/lib/db/functions";
import { hasAccessAuthMiddleware } from "@/lib/middlewares";
import { describeRoute } from "@/lib/openapi";
import { ErrorResponseSchema, SuccessResponseSchema, type AppEnv } from "@/lib/types";
import * as Sentry from "@sentry/node";
import { Hono } from "hono";
import { resolver, validator as zValidator } from "hono-openapi";
import z4 from "zod/v4";

// Admin dashboard analytics: reviewer-gated, returns only pre-aggregated numbers.
const app = new Hono<AppEnv>();

const errorResponses = {
    401: { description: "Unauthorized.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
    500: { description: "Server error.", content: { "application/json": { schema: resolver(ErrorResponseSchema) } } },
};

const trendQuerySchema = z4.object({
    days: z4.coerce.number().int().min(1).max(90).default(30),
});
const dailySeriesData = z4.object({
    data: z4.array(z4.object({ date: z4.string(), count: z4.number() })),
});
app.get(
    "/user-joins",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getAnalyticsUserJoins",
        role: "Reviewer",
        description: "Daily count of new users over the requested window.",
        tags: ["analytics"],
        responses: {
            200: { description: "User join trend.", content: { "application/json": { schema: resolver(SuccessResponseSchema(dailySeriesData)) } } },
            ...errorResponses,
        },
    }),
    zValidator("query", trendQuerySchema),
    async (c) => {
        try {
            const { days } = c.req.valid("query");
            return c.json({ success: true, data: await getUserJoinTrend(days) });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch user join trend" }, 500);
        }
    },
);

app.get(
    "/audit-trend",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getAnalyticsAuditTrend",
        role: "Reviewer",
        description: "Daily count of audit log actions over the requested window.",
        tags: ["analytics"],
        responses: {
            200: { description: "Audit trend.", content: { "application/json": { schema: resolver(SuccessResponseSchema(dailySeriesData)) } } },
            ...errorResponses,
        },
    }),
    zValidator("query", trendQuerySchema.extend({ days: z4.coerce.number().int().min(1).max(90).default(14) })),
    async (c) => {
        try {
            const { days } = c.req.valid("query");
            return c.json({ success: true, data: await getAuditTrend(days) });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch audit trend" }, 500);
        }
    },
);

const auditCategoriesData = z4.object({
    data: z4.array(z4.object({ category: z4.string(), count: z4.number() })),
});
app.get(
    "/audit-categories",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getAnalyticsAuditCategories",
        role: "Reviewer",
        description: "Audit log action counts grouped by target type.",
        tags: ["analytics"],
        responses: {
            200: {
                description: "Audit categories.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(auditCategoriesData)) } },
            },
            ...errorResponses,
        },
    }),
    async (c) => {
        try {
            return c.json({ success: true, data: await getAuditCategories() });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch audit categories" }, 500);
        }
    },
);

const adminActivityQuerySchema = z4.object({
    limit: z4.coerce.number().int().min(1).max(20).default(8),
    days: z4.coerce.number().int().min(1).max(365).optional(),
});
const adminActivityData = z4.object({
    data: z4.array(
        z4.object({
            actorId: z4.string(),
            name: z4.string(),
            image: z4.string().nullable(),
            role: z4.string().nullable(),
            discordId: z4.string().nullable(),
            count: z4.number(),
            topActions: z4.array(z4.object({ action: z4.string(), count: z4.number() })),
        }),
    ),
});
app.get(
    "/admin-activity",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getAnalyticsAdminActivity",
        role: "Reviewer",
        description: "Admins ranked by audit log action count, with profile info. All time unless `days` is given.",
        tags: ["analytics"],
        responses: {
            200: {
                description: "Top admin activity.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(adminActivityData)) } },
            },
            ...errorResponses,
        },
    }),
    zValidator("query", adminActivityQuerySchema),
    async (c) => {
        try {
            const { limit, days } = c.req.valid("query");
            return c.json({ success: true, data: await getTopAdminActivity(limit, days) });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch admin activity" }, 500);
        }
    },
);

const seasonQuerySchema = z4.object({
    seasonId: z4.coerce.number().int().positive().optional(),
});

const cwlAssignmentData = z4.object({
    assigned: z4.number(),
    unassigned: z4.number(),
    seasonId: z4.number().nullable(),
    seasonName: z4.string().nullable(),
});
app.get(
    "/cwl-assignment",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getAnalyticsCwlAssignment",
        role: "Reviewer",
        description: "Assigned vs unassigned CWL application counts for a season.",
        tags: ["analytics"],
        responses: {
            200: { description: "CWL assignment.", content: { "application/json": { schema: resolver(SuccessResponseSchema(cwlAssignmentData)) } } },
            ...errorResponses,
        },
    }),
    zValidator("query", seasonQuerySchema),
    async (c) => {
        try {
            const { seasonId } = c.req.valid("query");
            return c.json({ success: true, data: await getCwlAssignmentStats(seasonId) });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL assignment stats" }, 500);
        }
    },
);

const cwlParticipationData = z4.object({
    participated: z4.number(),
    totalUsers: z4.number(),
    seasonId: z4.number().nullable(),
    seasonName: z4.string().nullable(),
});
app.get(
    "/cwl-participation",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getAnalyticsCwlParticipation",
        role: "Reviewer",
        description: "Participating users vs total users for a CWL season.",
        tags: ["analytics"],
        responses: {
            200: {
                description: "CWL participation.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(cwlParticipationData)) } },
            },
            ...errorResponses,
        },
    }),
    zValidator("query", seasonQuerySchema),
    async (c) => {
        try {
            const { seasonId } = c.req.valid("query");
            return c.json({ success: true, data: await getCwlParticipationStats(seasonId) });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL participation stats" }, 500);
        }
    },
);

const overviewData = z4.object({
    users: z4.object({ total: z4.number(), newLast30d: z4.number(), banned: z4.number() }),
    cocAccounts: z4.object({ total: z4.number(), external: z4.number() }),
    pendingJoinApplications: z4.number(),
    status: z4.object({ applicationsEnabled: z4.boolean(), cwlEnabled: z4.boolean(), maintenance: z4.boolean() }),
});
app.get(
    "/overview",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getAnalyticsOverview",
        role: "Reviewer",
        description: "Headline counts for the admin dashboard: users, CoC accounts, pending join applications and site status.",
        tags: ["analytics"],
        responses: {
            200: { description: "Overview.", content: { "application/json": { schema: resolver(SuccessResponseSchema(overviewData)) } } },
            ...errorResponses,
        },
    }),
    async (c) => {
        try {
            return c.json({ success: true, data: await getAdminOverview() });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch overview" }, 500);
        }
    },
);

const cwlSeasonOverviewData = z4.object({
    seasonId: z4.number().nullable(),
    seasonName: z4.string().nullable(),
    applications: z4.number(),
    applicants: z4.number(),
    assigned: z4.number(),
    bonuses: z4.number(),
    byClan: z4.array(z4.object({ tag: z4.string(), name: z4.string(), league: z4.string(), count: z4.number() })),
    byTownHall: z4.array(z4.object({ townHall: z4.number(), count: z4.number() })),
});
app.get(
    "/cwl-season-overview",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getAnalyticsCwlSeasonOverview",
        role: "Reviewer",
        description: "A CWL season's application totals, per-clan placement and town hall spread. Defaults to the current season.",
        tags: ["analytics"],
        responses: {
            200: {
                description: "CWL season overview.",
                content: { "application/json": { schema: resolver(SuccessResponseSchema(cwlSeasonOverviewData)) } },
            },
            ...errorResponses,
        },
    }),
    zValidator("query", seasonQuerySchema),
    async (c) => {
        try {
            const { seasonId } = c.req.valid("query");
            return c.json({ success: true, data: await getCwlSeasonOverview(seasonId) });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL season overview" }, 500);
        }
    },
);

const cwlSeasonSchema = z4.object({
    id: z4.number(),
    name: z4.string(),
    month: z4.string(),
    year: z4.number(),
    createdAt: z4.date().nullable(),
});
const cwlSeasonsData = z4.object({ seasons: z4.array(cwlSeasonSchema) });
app.get(
    "/cwl-seasons",
    hasAccessAuthMiddleware(isReviewer),
    describeRoute({
        operationId: "getAnalyticsCwlSeasons",
        role: "Reviewer",
        description: "Lists CWL seasons for the analytics season selector.",
        tags: ["analytics"],
        responses: {
            200: { description: "Seasons.", content: { "application/json": { schema: resolver(SuccessResponseSchema(cwlSeasonsData)) } } },
            ...errorResponses,
        },
    }),
    async (c) => {
        try {
            return c.json({ success: true, data: await getCwlSeasons() });
        } catch (error) {
            Sentry.captureException(error);
            return c.json({ success: false, error: "Failed to fetch CWL seasons" }, 500);
        }
    },
);

export default app;
