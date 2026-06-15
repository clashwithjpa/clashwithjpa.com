<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import Chart from "$lib/components/ui/Chart.svelte";
    import HoverCard from "$lib/components/ui/HoverCard.svelte";
    import RoleBadge from "$lib/components/ui/RoleBadge.svelte";
    import Select, { type Option } from "$lib/components/ui/Select.svelte";
    import { actionConfig } from "$lib/config/auditLog";
    import type { Role } from "$lib/config/roles";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import {
        getAnalyticsAdminActivity,
        getAnalyticsAuditCategories,
        getAnalyticsAuditTrend,
        getAnalyticsCwlAssignment,
        getAnalyticsCwlParticipation,
        getAnalyticsCwlSeasons,
        getAnalyticsUserJoins,
    } from "@repo/clashofclans-client";
    import type { AgCartesianChartOptions, AgPolarChartOptions } from "ag-charts-community";
    import { onMount } from "svelte";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerActivity from "~icons/tabler/activity";
    import TablerChartBarPopular from "~icons/tabler/chart-bar-popular";
    import TablerListNumbers from "~icons/tabler/list-numbers";

    type DailyPoint = { date: string; count: number };
    type CategoryPoint = { category: string; count: number };
    type CwlAssignment = { assigned: number; unassigned: number; seasonName: string | null };
    type CwlParticipation = { participated: number; totalUsers: number; seasonName: string | null };
    type AdminActivity = {
        actorId: string;
        name: string;
        image: string | null;
        role: string | null;
        discordId: string | null;
        count: number;
        topActions: { action: string; count: number }[];
    };

    let userJoins = $state<DailyPoint[] | null>(null);
    let auditTrend = $state<DailyPoint[] | null>(null);
    let auditCategories = $state<CategoryPoint[] | null>(null);
    let adminActivity = $state<AdminActivity[] | null>(null);
    let cwlAssignment = $state<CwlAssignment | null>(null);
    let cwlParticipation = $state<CwlParticipation | null>(null);
    let loading = $state(true);

    let seasons = $state<{ id: number; name: string }[]>([]);
    let selectedSeasonValue = $state<string>("");
    let seasonOptions = $derived<Option[]>(seasons.map((s) => ({ label: s.name, value: String(s.id) })));
    let cwlLoading = $state(false);

    const USER_JOIN_DAYS = 30;
    const AUDIT_DAYS = 14;
    const ADMIN_ACTIVITY_LIMIT = 8;
    const opts = { baseURL: PUBLIC_SERVER_URL, credentials: "include" as const };

    function dailySeries(points: DailyPoint[]) {
        return points.map((p) => ({
            label: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            count: p.count,
        }));
    }

    async function fetchCwl(seasonId?: number) {
        cwlLoading = true;
        try {
            const params = seasonId !== undefined ? { seasonId } : undefined;
            const [assignResp, participationResp] = await Promise.all([
                getAnalyticsCwlAssignment(params, opts),
                getAnalyticsCwlParticipation(params, opts),
            ]);
            if (assignResp.success) {
                cwlAssignment = assignResp.data;
                if (!selectedSeasonValue && assignResp.data.seasonId != null) selectedSeasonValue = String(assignResp.data.seasonId);
            }
            if (participationResp.success) cwlParticipation = participationResp.data;
        } catch {
            // leave the previously rendered CWL charts in place on failure
        } finally {
            cwlLoading = false;
        }
    }

    onMount(async () => {
        const [joinsResp, auditTrendResp, auditCategoriesResp, adminActivityResp, seasonsResp] = await Promise.allSettled([
            getAnalyticsUserJoins({ days: USER_JOIN_DAYS }, opts),
            getAnalyticsAuditTrend({ days: AUDIT_DAYS }, opts),
            getAnalyticsAuditCategories(opts),
            getAnalyticsAdminActivity({ limit: ADMIN_ACTIVITY_LIMIT }, opts),
            getAnalyticsCwlSeasons(opts),
        ]);

        if (joinsResp.status === "fulfilled" && joinsResp.value.success) userJoins = joinsResp.value.data.data;
        if (auditTrendResp.status === "fulfilled" && auditTrendResp.value.success) auditTrend = auditTrendResp.value.data.data;
        if (auditCategoriesResp.status === "fulfilled" && auditCategoriesResp.value.success) auditCategories = auditCategoriesResp.value.data.data;
        if (adminActivityResp.status === "fulfilled" && adminActivityResp.value.success) adminActivity = adminActivityResp.value.data.data;
        if (seasonsResp.status === "fulfilled" && seasonsResp.value.success) seasons = seasonsResp.value.data.seasons;
        await fetchCwl();
        loading = false;
    });

    const userJoinTrendOptions = $derived.by<AgCartesianChartOptions | null>(() => {
        if (!userJoins) return null;
        return {
            title: { text: "Users Joined (Last 30 Days)" },
            data: dailySeries(userJoins),
            series: [
                {
                    type: "area",
                    xKey: "label",
                    yKey: "count",
                    yName: "Users",
                    fill: "#22c55e",
                    stroke: "#22c55e",
                    fillOpacity: 0.4,
                    interpolation: { type: "smooth" },
                    marker: { enabled: false },
                },
            ],
            axes: {
                x: { type: "category" },
                y: { type: "number", nice: true },
            },
        };
    });

    const cwlAssignmentOptions = $derived.by<AgPolarChartOptions | null>(() => {
        if (!cwlAssignment) return null;
        return {
            title: { text: "CWL Applications Assignment" },
            subtitle: cwlAssignment.seasonName ? { text: cwlAssignment.seasonName } : undefined,
            data: [
                { state: "Assigned", count: cwlAssignment.assigned },
                { state: "Unassigned", count: cwlAssignment.unassigned },
            ],
            series: [
                {
                    type: "donut",
                    angleKey: "count",
                    legendItemKey: "state",
                    innerRadiusRatio: 0.6,
                    fills: ["#22c55e", "#a8a29e"],
                    strokes: ["#22c55e", "#a8a29e"],
                    calloutLabel: { enabled: false },
                },
            ],
        };
    });

    const cwlParticipationOptions = $derived.by<AgPolarChartOptions | null>(() => {
        if (!cwlParticipation) return null;
        const nonParticipatedCount = Math.max(0, cwlParticipation.totalUsers - cwlParticipation.participated);
        return {
            title: { text: "CWL Participation Overview" },
            subtitle: cwlParticipation.seasonName ? { text: cwlParticipation.seasonName } : undefined,
            data: [
                { state: "Participated", count: cwlParticipation.participated },
                { state: "Not Participated", count: nonParticipatedCount },
            ],
            series: [
                {
                    type: "donut",
                    angleKey: "count",
                    legendItemKey: "state",
                    innerRadiusRatio: 0.6,
                    fills: ["#3b82f6", "#a8a29e"],
                    strokes: ["#3b82f6", "#a8a29e"],
                    calloutLabel: { enabled: false },
                },
            ],
        };
    });

    const auditTrendOptions = $derived.by<AgCartesianChartOptions | null>(() => {
        if (!auditTrend) return null;
        return {
            title: { text: "Server Activity (Last 14 Days)" },
            data: dailySeries(auditTrend),
            series: [{ type: "line", xKey: "label", yKey: "count", yName: "Actions", marker: { enabled: true }, interpolation: { type: "smooth" } }],
            axes: {
                x: { type: "category" },
                y: { type: "number", nice: true },
            },
        };
    });

    const auditCategoryOptions = $derived.by<AgCartesianChartOptions | null>(() => {
        if (!auditCategories) return null;
        return {
            title: { text: "Activity by Category" },
            data: auditCategories,
            series: [{ type: "bar", xKey: "category", yKey: "count", yName: "Actions", cornerRadius: 4 }],
            axes: {
                x: { type: "category" },
                y: { type: "number", nice: true },
            },
        };
    });

    type ChartCard = { options: AgCartesianChartOptions | AgPolarChartOptions };
    const charts = $derived(
        (
            [
                { options: cwlAssignmentOptions },
                { options: cwlParticipationOptions },
                { options: auditTrendOptions },
                { options: auditCategoryOptions },
            ] as { options: AgCartesianChartOptions | AgPolarChartOptions | null }[]
        ).filter((c): c is ChartCard => c.options !== null),
    );

    const maxActivity = $derived(adminActivity?.length ? Math.max(...adminActivity.map((a) => a.count)) : 0);
    const BAR_MAX_PX = 130;
    function barHeight(count: number) {
        return maxActivity > 0 ? Math.max(6, Math.round((count / maxActivity) * BAR_MAX_PX)) : 6;
    }
    const hasContent = $derived(!!userJoinTrendOptions || (adminActivity?.length ?? 0) > 0 || charts.length > 0);
</script>

{#if loading}
    <div in:fadeIn class="flex items-center justify-start gap-2 text-2xl font-bold text-stone-400">
        <SvgSpinnersRingResize />
        <span>Analytics</span>
    </div>
{:else}
    <div in:fadeIn class="flex flex-col gap-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 class="text-2xl font-bold">Analytics</h2>
            {#if seasonOptions.length > 0}
                <div class="flex items-center gap-2">
                    <span class="shrink-0 text-xs font-medium text-stone-400">CWL season</span>
                    <div class="w-full sm:w-44">
                        <Select
                            options={seasonOptions}
                            bind:value={selectedSeasonValue}
                            onValueChange={(v) => fetchCwl(v ? Number(v) : undefined)}
                            placeholder="Season"
                            disabled={cwlLoading}
                        />
                    </div>
                </div>
            {/if}
        </div>
        {#if !hasContent}
            <div class="flex items-center justify-start gap-2 text-stone-400">
                <TablerChartBarPopular class="size-5 text-stone-300" />
                <span>No analytics data available</span>
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {#if userJoinTrendOptions}
                    <div use:cardSlideIn class="h-72 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4 lg:col-span-2">
                        <Chart options={userJoinTrendOptions} />
                    </div>
                {/if}
                {#if adminActivity && adminActivity.length > 0}
                    <div use:cardSlideIn class="flex flex-col gap-3 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4 lg:col-span-2">
                        <h3 class="text-center text-sm font-bold text-stone-200">Top Admin Activity</h3>
                        <div class="edge-fade flex items-end justify-around gap-2 overflow-x-auto pt-2 sm:gap-4">
                            {#each adminActivity as actor (actor.actorId)}
                                <div class="flex min-w-14 flex-1 flex-col items-center">
                                    <div class="flex flex-col items-center justify-end gap-1.5" style="height: {BAR_MAX_PX + 64}px">
                                        <span class="text-sm font-bold text-stone-100 tabular-nums">{actor.count}</span>
                                        <HoverCard maxWidth="max-w-sm">
                                            {#snippet trigger()}
                                                <Avatar src={actor.image} name={actor.name} role={actor.role as Role | null} size="sm" />
                                            {/snippet}
                                            <div class="flex flex-col gap-2">
                                                <div class="flex items-center justify-start gap-2">
                                                    <Avatar src={actor.image} name={actor.name} role={actor.role as Role | null} size="lg" />
                                                    <div class="flex min-w-0 flex-col">
                                                        <span class="truncate text-lg font-semibold text-stone-50">{actor.name}</span>
                                                        {#if actor.role}
                                                            <RoleBadge role={actor.role} class="w-fit" />
                                                        {/if}
                                                    </div>
                                                </div>
                                                <div class="flex flex-col gap-1 border-t-2 border-stone-700/50 pt-2">
                                                    {#if actor.discordId}
                                                        <div class="flex items-center justify-between gap-4">
                                                            <span class="flex items-center gap-2 text-sm font-medium text-stone-400">
                                                                <SimpleIconsDiscord class="size-4 shrink-0" />
                                                                Discord ID
                                                            </span>
                                                            <span class="truncate font-mono text-xs text-stone-200">{actor.discordId}</span>
                                                        </div>
                                                    {/if}
                                                    <div class="flex items-center justify-between gap-4">
                                                        <span class="flex items-center gap-2 text-sm font-medium text-stone-400">
                                                            <TablerActivity class="size-4 shrink-0" />
                                                            Total actions
                                                        </span>
                                                        <span class="font-mono text-xs text-stone-50 tabular-nums">{actor.count}</span>
                                                    </div>
                                                </div>
                                                {#if actor.topActions.length > 0}
                                                    <div class="flex flex-col gap-2 border-t-2 border-stone-700/50 pt-2">
                                                        <span class="flex items-center gap-2 text-sm font-medium text-stone-400">
                                                            <TablerListNumbers class="size-4 shrink-0" />
                                                            Top actions
                                                        </span>
                                                        {#each actor.topActions as a (a.action)}
                                                            {@const Icon = actionConfig(a.action).icon}
                                                            <div
                                                                class="flex items-center justify-between gap-2 rounded-md bg-stone-800 px-2 py-1 text-xs"
                                                            >
                                                                <span class="flex min-w-0 items-center gap-1.5">
                                                                    <Icon class="size-4 shrink-0 text-stone-400" />
                                                                    <span class="truncate font-mono text-stone-200">{a.action}</span>
                                                                </span>
                                                                <span class="font-mono text-stone-400 tabular-nums">{a.count}</span>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                {/if}
                                            </div>
                                        </HoverCard>
                                        <div
                                            class="w-9 rounded-t-md bg-linear-to-t from-green-500/30 to-green-500"
                                            style="height: {barHeight(actor.count)}px"
                                        ></div>
                                    </div>
                                    <span class="mt-2 w-full truncate text-center text-xs font-medium text-stone-300">{actor.name}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
                {#each charts as chart (chart.options.title?.text)}
                    <div use:cardSlideIn class="h-72 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                        <Chart options={chart.options} />
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/if}
