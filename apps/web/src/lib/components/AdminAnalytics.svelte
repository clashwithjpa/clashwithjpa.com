<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Chart from "$lib/components/ui/Chart.svelte";
    import Select, { type Option } from "$lib/components/ui/Select.svelte";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import { getAuditLog, getCwlApplications, getCwlSeasons, getJoinApplications } from "@repo/clashofclans-client";
    import type { AgCartesianChartOptions, AgPolarChartOptions } from "ag-charts-community";
    import { onMount } from "svelte";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerChartBarPopular from "~icons/tabler/chart-bar-popular";

    interface Props {
        permissions?: Record<string, boolean>;
    }

    let { permissions = {} }: Props = $props();

    const canReview = $derived(!!permissions.review);
    const canManage = $derived(!!permissions.manage);

    type JoinApp = { status: string; createdAt: string };
    type CwlApp = { discordUserId: string; assignedTo: string | null; isExternal: boolean };
    type AuditEntry = { action: string; targetType: string | null; createdAt: string };

    let joinApps = $state<JoinApp[] | null>(null);
    let cwlApps = $state<CwlApp[] | null>(null);
    let auditEntries = $state<AuditEntry[] | null>(null);
    let totalUsers = $state<number | null>(null);
    let loading = $state(true);

    let seasons = $state<{ id: number; name: string }[]>([]);
    let selectedSeasonValue = $state<string>("");
    let seasonOptions = $derived<Option[]>(seasons.map((s) => ({ label: s.name, value: String(s.id) })));
    let cwlLoading = $state(false);
    let selectedSeasonName = $derived(seasons.find((s) => String(s.id) === selectedSeasonValue)?.name ?? null);

    const DAYS = 14;

    function bucketByDay(items: { createdAt: string }[]) {
        const map = new Map<string, number>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = DAYS - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            map.set(d.toISOString().slice(0, 10), 0);
        }
        for (const item of items) {
            const key = new Date(item.createdAt).toISOString().slice(0, 10);
            if (map.has(key)) map.set(key, map.get(key)! + 1);
        }
        return [...map.entries()].map(([date, count]) => ({
            label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            count,
        }));
    }

    async function fetchCwlApps(seasonId?: number) {
        cwlLoading = true;
        try {
            const resp = await getCwlApplications({ limit: 200, seasonId }, { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                cwlApps = resp.data.applications;
                if (!selectedSeasonValue && resp.data.seasonId != null) selectedSeasonValue = String(resp.data.seasonId);
            }
        } catch {
            // leave the previously rendered CWL charts in place on failure
        } finally {
            cwlLoading = false;
        }
    }

    onMount(async () => {
        const opts = { baseURL: PUBLIC_SERVER_URL, credentials: "include" as const };
        const [joinResp, auditResp, usersResp, seasonsResp] = await Promise.allSettled([
            canReview ? getJoinApplications({ limit: 200 }, opts) : Promise.resolve(null),
            canManage ? getAuditLog({ limit: 200 }, opts) : Promise.resolve(null),
            canManage
                ? fetch(`${PUBLIC_SERVER_URL}/admin/users?limit=1&offset=0`, { credentials: "include" }).then((r) => r.json())
                : Promise.resolve(null),
            canManage ? getCwlSeasons(opts) : Promise.resolve(null),
        ]);

        if (joinResp.status === "fulfilled" && joinResp.value?.success) joinApps = joinResp.value.data.applications;
        if (auditResp.status === "fulfilled" && auditResp.value?.success) auditEntries = auditResp.value.data.entries;
        if (usersResp.status === "fulfilled" && usersResp.value?.success) totalUsers = usersResp.value.data.total;
        if (seasonsResp.status === "fulfilled" && seasonsResp.value?.success) seasons = seasonsResp.value.data.seasons;
        if (canManage) await fetchCwlApps();
        loading = false;
    });

    const joinStatusOptions = $derived.by<AgPolarChartOptions | null>(() => {
        if (!joinApps) return null;
        const counts = { pending: 0, accepted: 0, rejected: 0 };
        for (const app of joinApps) if (app.status in counts) counts[app.status as keyof typeof counts]++;
        return {
            title: { text: "Join Applications by Status" },
            data: [
                { status: "Pending", count: counts.pending },
                { status: "Accepted", count: counts.accepted },
                { status: "Rejected", count: counts.rejected },
            ],
            series: [
                {
                    type: "donut",
                    angleKey: "count",
                    legendItemKey: "status",
                    innerRadiusRatio: 0.6,
                    fills: ["#eab308", "#22c55e", "#ef4444"],
                    strokes: ["#eab308", "#22c55e", "#ef4444"],
                    calloutLabel: { enabled: false },
                },
            ],
        };
    });

    const joinTrendOptions = $derived.by<AgCartesianChartOptions | null>(() => {
        if (!joinApps) return null;
        return {
            title: { text: "Join Applications (Last 14 Days)" },
            data: bucketByDay(joinApps),
            series: [{ type: "area", xKey: "label", yKey: "count", yName: "Applications", fillOpacity: 0.4, interpolation: { type: "smooth" } }],
            axes: {
                x: { type: "category" },
                y: { type: "number", nice: true },
            },
        };
    });

    const cwlAssignmentOptions = $derived.by<AgPolarChartOptions | null>(() => {
        if (!cwlApps) return null;
        let assigned = 0;
        let unassigned = 0;
        for (const app of cwlApps) app.assignedTo ? assigned++ : unassigned++;
        return {
            title: { text: "CWL Applications Assignment" },
            subtitle: selectedSeasonName ? { text: selectedSeasonName } : undefined,
            data: [
                { state: "Assigned", count: assigned },
                { state: "Unassigned", count: unassigned },
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
        if (!cwlApps || totalUsers === null) return null;
        const participantIds = new Set(cwlApps.map((app) => app.discordUserId));
        const participatedCount = participantIds.size;
        const nonParticipatedCount = Math.max(0, totalUsers - participatedCount);
        return {
            title: { text: "CWL Participation Overview" },
            subtitle: selectedSeasonName ? { text: selectedSeasonName } : undefined,
            data: [
                { state: "Participated", count: participatedCount },
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
        if (!auditEntries) return null;
        return {
            title: { text: "Server Activity (Last 14 Days)" },
            data: bucketByDay(auditEntries),
            series: [{ type: "line", xKey: "label", yKey: "count", yName: "Actions", marker: { enabled: true }, interpolation: { type: "smooth" } }],
            axes: {
                x: { type: "category" },
                y: { type: "number", nice: true },
            },
        };
    });

    const auditCategoryOptions = $derived.by<AgCartesianChartOptions | null>(() => {
        if (!auditEntries) return null;
        const counts = new Map<string, number>();
        for (const entry of auditEntries) {
            const key = (entry.targetType ?? "other").replace(/_/g, " ");
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const data = [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
        return {
            title: { text: "Activity by Category" },
            data,
            series: [{ type: "bar", xKey: "category", yKey: "count", yName: "Actions", cornerRadius: 4 }],
            axes: {
                x: { type: "category" },
                y: { type: "number", nice: true },
            },
        };
    });

    const charts = $derived(
        [joinStatusOptions, joinTrendOptions, cwlAssignmentOptions, cwlParticipationOptions, auditTrendOptions, auditCategoryOptions].filter(
            (option): option is AgCartesianChartOptions | AgPolarChartOptions => option !== null,
        ),
    );
</script>

{#if canReview || canManage}
    {#if loading}
        <div in:fadeIn class="flex items-center justify-start gap-2 text-2xl font-bold text-stone-400">
            <SvgSpinnersRingResize />
            <span>Analytics</span>
        </div>
    {:else}
        <div in:fadeIn class="flex flex-col gap-3">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 class="text-2xl font-bold">Analytics</h2>
                {#if canManage && seasonOptions.length > 0}
                    <div class="flex items-center gap-2">
                        <span class="shrink-0 text-xs font-medium text-stone-400">CWL season</span>
                        <div class="w-full sm:w-44">
                            <Select
                                options={seasonOptions}
                                bind:value={selectedSeasonValue}
                                onValueChange={(v) => fetchCwlApps(v ? Number(v) : undefined)}
                                placeholder="Season"
                                disabled={cwlLoading}
                            />
                        </div>
                    </div>
                {/if}
            </div>
            {#if charts.length === 0}
                <div class="flex items-center justify-start gap-2 text-stone-400">
                    <TablerChartBarPopular class="size-5 text-stone-300" />
                    <span>No analytics data available</span>
                </div>
            {:else}
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {#each charts as options (options.title?.text)}
                        <div use:cardSlideIn class="h-72 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                            <Chart {options} />
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
{/if}
