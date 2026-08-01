<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Chart from "$lib/components/ui/Chart.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import { keyLevel, maskedKey, SCOPE_LABELS, scopesUpTo, STATUS_CLASS_COLORS, type ApiKeyRow } from "$lib/config/apiKeys";
    import { formatDateTime, formatRelativeTime } from "$lib/utils";
    import { getApiKeyUsageDaily, getApiKeyUsageEndpoints, getApiKeyUsageStatus, getApiKeyUsageSummary } from "@repo/clashofclans-client";
    import type { AgCartesianChartOptions, AgPolarChartOptions } from "ag-charts-community";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerChartBarPopular from "~icons/tabler/chart-bar-popular";
    import TablerRefresh from "~icons/tabler/refresh";

    let { apiKey }: { apiKey: ApiKeyRow } = $props();

    type DailyPoint = { date: string; count: number };
    type EndpointPoint = { method: string; path: string; count: number; avgDurationMs: number };
    type StatusPoint = { statusClass: string; count: number };
    type Summary = {
        requests: number;
        errors: number;
        errorRate: number;
        p50DurationMs: number;
        p95DurationMs: number;
        windowRequests: number;
        rateLimitRemaining: number | null;
        rateLimitResetAt: string | Date | null;
        remaining: number | null;
        rateLimitMax: number | null;
        rateLimitTimeWindow: number | null;
        lastRequest: string | Date | null;
    };

    const WINDOW_DAYS = 30;
    const ENDPOINT_LIMIT = 8;
    const opts = { baseURL: PUBLIC_SERVER_URL, credentials: "include" as const };

    let summary = $state<Summary | null>(null);
    let daily = $state<DailyPoint[] | null>(null);
    let endpoints = $state<EndpointPoint[] | null>(null);
    let statuses = $state<StatusPoint[] | null>(null);
    let loading = $state(true);
    let refreshing = $state(false);

    const level = $derived(keyLevel(apiKey));
    const included = $derived(level ? scopesUpTo(level).filter((scope) => scope !== level) : []);

    async function load(keyId: string) {
        const [summaryResp, dailyResp, endpointsResp, statusResp] = await Promise.allSettled([
            getApiKeyUsageSummary({ keyId, days: WINDOW_DAYS }, opts),
            getApiKeyUsageDaily({ keyId, days: WINDOW_DAYS }, opts),
            getApiKeyUsageEndpoints({ keyId, days: WINDOW_DAYS, limit: ENDPOINT_LIMIT }, opts),
            getApiKeyUsageStatus({ keyId, days: WINDOW_DAYS }, opts),
        ]);

        // Ignore a response that landed after the user moved to another key.
        if (apiKey.id !== keyId) return;
        if (summaryResp.status === "fulfilled" && summaryResp.value.success) summary = summaryResp.value.data as Summary;
        if (dailyResp.status === "fulfilled" && dailyResp.value.success) daily = dailyResp.value.data.data;
        if (endpointsResp.status === "fulfilled" && endpointsResp.value.success) endpoints = endpointsResp.value.data.data;
        if (statusResp.status === "fulfilled" && statusResp.value.success) statuses = statusResp.value.data.data;
    }

    // Refetches on key change: the sidebar is reused, not remounted.
    $effect(() => {
        const keyId = apiKey.id;
        loading = true;
        summary = daily = endpoints = statuses = null;
        load(keyId).then(() => {
            if (apiKey.id === keyId) loading = false;
        });
    });

    // Unlike the key switch above, this keeps the current figures on screen while
    // it runs rather than swapping the populated panel for a spinner.
    async function refresh() {
        if (loading || refreshing) return;
        refreshing = true;
        try {
            await load(apiKey.id);
            now = Date.now();
        } finally {
            refreshing = false;
        }
    }

    function dailySeries(points: DailyPoint[]) {
        return points.map((p) => ({
            label: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            count: p.count,
        }));
    }

    const dailyOptions = $derived.by<AgCartesianChartOptions | null>(() => {
        if (!daily) return null;
        return {
            title: { text: `Requests (Last ${WINDOW_DAYS} Days)` },
            data: dailySeries(daily),
            series: [
                {
                    type: "area",
                    xKey: "label",
                    yKey: "count",
                    yName: "Requests",
                    fill: "#3b82f6",
                    stroke: "#3b82f6",
                    fillOpacity: 0.4,
                    interpolation: { type: "smooth" },
                    marker: { enabled: false },
                },
            ],
            axes: { x: { type: "category" }, y: { type: "number", nice: true } },
        };
    });

    const endpointOptions = $derived.by<AgCartesianChartOptions | null>(() => {
        if (!endpoints?.length) return null;
        return {
            title: { text: "Top Endpoints" },
            data: endpoints.map((e) => ({ endpoint: `${e.method} ${e.path}`, count: e.count })),
            series: [{ type: "bar", direction: "horizontal", xKey: "endpoint", yKey: "count", yName: "Requests", cornerRadius: 4 }],
            axes: { y: { type: "category" }, x: { type: "number", nice: true } },
        };
    });

    const statusOptions = $derived.by<AgPolarChartOptions | null>(() => {
        if (!statuses?.length) return null;
        const colors = statuses.map((s) => STATUS_CLASS_COLORS[s.statusClass] ?? "#a8a29e");
        return {
            title: { text: "Response Status" },
            data: statuses,
            series: [
                {
                    type: "donut",
                    angleKey: "count",
                    legendItemKey: "statusClass",
                    innerRadiusRatio: 0.6,
                    fills: colors,
                    strokes: colors,
                    calloutLabel: { enabled: false },
                },
            ],
        };
    });

    // Drives the countdowns below, which would otherwise freeze at whatever they
    // said when the panel loaded.
    let now = $state(Date.now());
    $effect(() => {
        const id = setInterval(() => (now = Date.now()), 15_000);
        return () => clearInterval(id);
    });

    function formatDuration(ms: number): string {
        const minutes = Math.round(ms / 60_000);
        if (minutes < 1) return `${Math.max(1, Math.round(ms / 1000))}s`;
        if (minutes < 60) return `${minutes} min`;
        const hours = minutes / 60;
        return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
    }

    const windowLabel = $derived(summary?.rateLimitTimeWindow ? formatDuration(summary.rateLimitTimeWindow) : null);

    const resetLabel = $derived.by(() => {
        if (!summary?.rateLimitResetAt) return null;
        const remainingMs = new Date(summary.rateLimitResetAt).getTime() - now;
        return remainingMs <= 0 ? "resets on next request" : `resets in ${formatDuration(remainingMs)}`;
    });

    const resetTooltip = $derived.by(() => {
        if (!summary?.rateLimitResetAt) return "";
        const resetAt = new Date(summary.rateLimitResetAt);
        if (resetAt.getTime() - now <= 0) return "Resets on the next request";
        return `Resets ${formatDateTime(resetAt)}`;
    });

    const lastUsedLabel = $derived.by(() => {
        // Read so the label re-derives on each tick.
        void now;
        return summary?.lastRequest ? formatRelativeTime(summary.lastRequest) : "Never";
    });

    const usedPercent = $derived(
        summary?.rateLimitRemaining != null && summary.rateLimitMax
            ? Math.max(0, Math.min(100, Math.round((summary.windowRequests / summary.rateLimitMax) * 100)))
            : null,
    );

    const meterColor = $derived(usedPercent === null ? "" : usedPercent >= 90 ? "bg-red-700" : usedPercent >= 70 ? "bg-yellow-700" : "bg-green-700");
</script>

<div class="flex flex-col gap-6">
    <!-- Right padding clears the panel's floating close button. -->
    <div class="flex flex-col gap-1 pr-10">
        <h2 class="truncate text-2xl font-bold">{apiKey.name ?? "Unnamed key"}</h2>
        <span class="font-mono text-xs text-stone-400">{maskedKey(apiKey)}</span>
    </div>

    <div class="flex flex-wrap gap-2">
        {#if level}
            <Badge variant={SCOPE_LABELS[level]?.writes ? "orange" : "blue"} content={SCOPE_LABELS[level]?.label ?? level} />
            {#each included as scope (scope)}
                <Badge variant="ghost" content={SCOPE_LABELS[scope]?.label ?? scope} />
            {/each}
        {/if}
    </div>

    <div class="flex items-center justify-between gap-2">
        <span class="text-lg font-bold text-stone-50">Usage</span>
        <Button size="icon" variant="ghost" disabled={loading || refreshing} tooltip="Refresh stats" tooltipPlacement="left" onclick={refresh}>
            <TablerRefresh class={refreshing ? "animate-spin" : ""} />
        </Button>
    </div>

    {#if loading}
        <div class="py-8">
            <SvgSpinnersBlocksScale class="mx-auto size-12 text-stone-400" />
        </div>
    {:else}
        <div class="grid grid-cols-2 gap-4">
            {#snippet stat(label: string, value: string, hint?: string)}
                <div class="flex flex-col gap-1 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                    <span class="text-xs font-medium text-stone-400">{label}</span>
                    <span class="text-2xl font-bold text-stone-50">{value}</span>
                    {#if hint}<span class="text-xs text-stone-400">{hint}</span>{/if}
                </div>
            {/snippet}

            {@render stat("Requests", (summary?.requests ?? 0).toLocaleString(), `last ${WINDOW_DAYS} days`)}
            {@render stat(
                "Requests left",
                summary?.rateLimitRemaining?.toLocaleString() ?? "∞",
                summary?.rateLimitRemaining == null
                    ? "no rate limit"
                    : (resetLabel ?? `of ${summary.rateLimitMax?.toLocaleString()} per ${windowLabel}`),
            )}
            {@render stat("Error rate", `${Math.round((summary?.errorRate ?? 0) * 100)}%`, `${(summary?.errors ?? 0).toLocaleString()} failed`)}
            {@render stat("Latency", `${summary?.p50DurationMs ?? 0}ms`, `p95 ${summary?.p95DurationMs ?? 0}ms`)}
        </div>

        <div class="flex flex-col gap-2 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
            <div class="flex items-center justify-between gap-2 text-sm">
                <span class="font-medium text-stone-400">Rate limit</span>
                <span class="text-stone-200">
                    {summary?.rateLimitMax?.toLocaleString() ?? "—"} requests{windowLabel ? ` / ${windowLabel}` : ""}
                </span>
            </div>
            {#if usedPercent !== null}
                <div class="h-2 w-full overflow-hidden rounded-full bg-stone-800">
                    <div class="h-full rounded-full {meterColor} transition-all duration-200 ease-in-out" style="width: {usedPercent}%"></div>
                </div>
                <div class="flex items-center justify-between gap-2 text-xs text-stone-400">
                    <span>{summary?.windowRequests.toLocaleString()}/{summary?.rateLimitMax?.toLocaleString()} used</span>
                    {#if resetLabel}
                        <Tooltip title={resetTooltip} placement="top">
                            <span>{resetLabel}</span>
                        </Tooltip>
                    {/if}
                </div>
            {/if}
            <div class="flex items-center justify-between gap-2 text-sm">
                <span class="font-medium text-stone-400">Last used</span>
                {#if summary?.lastRequest}
                    <Tooltip title={formatDateTime(summary.lastRequest)} placement="top">
                        <span class="text-stone-200">{lastUsedLabel}</span>
                    </Tooltip>
                {:else}
                    <span class="text-stone-200">Never</span>
                {/if}
            </div>
        </div>

        {#if (summary?.requests ?? 0) === 0}
            <div class="flex items-center justify-start gap-2 text-stone-400">
                <TablerChartBarPopular />
                <span>No requests recorded in the last {WINDOW_DAYS} days.</span>
            </div>
        {:else}
            {#if dailyOptions}
                <Chart options={dailyOptions} class="h-64 w-full" />
            {/if}
            {#if endpointOptions}
                <Chart options={endpointOptions} class="h-72 w-full" />
            {/if}
            {#if statusOptions}
                <Chart options={statusOptions} class="h-64 w-full" />
            {/if}
        {/if}
    {/if}
</div>
