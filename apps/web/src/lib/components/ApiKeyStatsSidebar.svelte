<script lang="ts">
    import Badge from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import ChartPanel from "#lib/components/ui/chart/ChartPanel.svelte";
    import Tooltip from "#lib/components/ui/Tooltip.svelte";
    import { keyLevel, maskedKey, SCOPE_LABELS, scopesUpTo, STATUS_CLASS_COLORS, type ApiKeyRow } from "#lib/config/apiKeys.js";
    import { formatDateTime, formatRelativeTime } from "#lib/utils.js";
    import { PUBLIC_SERVER_URL } from "$app/env/public";
    import { getApiKeyUsageDaily, getApiKeyUsageEndpoints, getApiKeyUsageStatus, getApiKeyUsageSummary } from "@repo/clashofclans-client";
    import { curveMonotoneX } from "d3-shape";
    import { AreaChart, BarChart, PieChart } from "layerchart";
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
    // Known before the stats arrive, so the skeleton can show charts or the "no requests" line up front.
    const hadRecentTraffic = $derived(apiKey.lastRequest != null && Date.now() - new Date(apiKey.lastRequest).getTime() < WINDOW_DAYS * 86_400_000);
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

    const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dailyData = $derived(daily ? daily.map((p) => ({ date: new Date(p.date), count: p.count })) : null);
    const endpointData = $derived(endpoints?.length ? endpoints.map((e) => ({ endpoint: `${e.method} ${e.path}`, count: e.count })) : null);
    const statusData = $derived(statuses?.length ? statuses : null);
    const statusColors = $derived((statuses ?? []).map((s) => STATUS_CLASS_COLORS[s.statusClass] ?? "var(--color-stone-400)"));
    const truncate = (text: string, max = 22) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

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
        <div class="grid grid-cols-2 gap-4" aria-busy="true">
            {#each { length: 4 }, i (i)}
                <div class="flex flex-col gap-1 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                    <div class="flex h-4 items-center"><div class="h-3 w-16 skeleton"></div></div>
                    <div class="flex h-8 items-center"><div class="h-6 w-20 skeleton"></div></div>
                    <div class="flex h-4 items-center"><div class="h-3 w-24 max-w-full skeleton"></div></div>
                </div>
            {/each}
        </div>
        <div class="flex flex-col gap-2 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
            <div class="flex h-5 items-center justify-between">
                <div class="h-3.5 w-20 skeleton"></div>
                <div class="h-3.5 w-28 skeleton"></div>
            </div>
            {#if apiKey.rateLimitMax != null}
                <div class="h-2 skeleton rounded-full"></div>
                <div class="flex h-4 items-center justify-between">
                    <div class="h-3 w-20 skeleton"></div>
                    <div class="h-3 w-24 skeleton"></div>
                </div>
            {/if}
            <div class="flex h-5 items-center justify-between">
                <div class="h-3.5 w-16 skeleton"></div>
                <div class="h-3.5 w-20 skeleton"></div>
            </div>
        </div>
        {#if hadRecentTraffic}
            {#each ["h-64", "h-72", "h-64"] as height, i (i)}
                <div class="flex w-full flex-col gap-2 {height}">
                    <div class="flex h-5 justify-center"><div class="h-3.5 w-40 skeleton"></div></div>
                    <div class="min-h-0 flex-1 skeleton rounded-lg"></div>
                </div>
            {/each}
        {:else}
            <div class="flex items-center gap-2">
                <div class="size-5 shrink-0 skeleton rounded"></div>
                <div class="flex flex-1 flex-col">
                    <div class="flex h-6 items-center"><div class="h-3.5 w-full skeleton"></div></div>
                    <div class="flex h-6 items-center"><div class="h-3.5 w-2/5 skeleton"></div></div>
                </div>
            </div>
        {/if}
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
            {#if dailyData}
                <ChartPanel title="Requests (Last {WINDOW_DAYS} Days)" class="h-64">
                    <AreaChart
                        data={dailyData}
                        x="date"
                        y="count"
                        series={[{ key: "count", label: "Requests", color: "var(--color-blue-500)" }]}
                        props={{
                            area: { curve: curveMonotoneX, fillOpacity: 0.25, line: { curve: curveMonotoneX, strokeWidth: 2 } },
                            xAxis: { format: shortDate },
                            tooltip: { header: { format: shortDate } },
                        }}
                    />
                </ChartPanel>
            {/if}
            {#if endpointData}
                <ChartPanel title="Top Endpoints" class="h-72">
                    <!-- Long paths are cut on the axis; the tooltip shows them in full. -->
                    <BarChart
                        data={endpointData}
                        orientation="horizontal"
                        x="count"
                        y="endpoint"
                        series={[{ key: "count", label: "Requests", color: "var(--color-blue-500)" }]}
                        padding={{ left: 150 }}
                        props={{ bars: { radius: 4, rounded: "edge" }, yAxis: { format: (v: string) => truncate(v) } }}
                    />
                </ChartPanel>
            {/if}
            {#if statusData}
                <ChartPanel title="Response Status" class="h-64">
                    <PieChart
                        data={statusData}
                        key="statusClass"
                        value="count"
                        c="statusClass"
                        cRange={statusColors}
                        innerRadius={0.6}
                        padAngle={0.02}
                        cornerRadius={4}
                        legend
                    />
                </ChartPanel>
            {/if}
        {/if}
    {/if}
</div>
