<script lang="ts">
    import { authClient } from "#lib/auth.js";
    import Avatar from "#lib/components/ui/Avatar.svelte";
    import Badge from "#lib/components/ui/Badge.svelte";
    import PageHeader from "#lib/components/ui/PageHeader.svelte";
    import Panel from "#lib/components/ui/Panel.svelte";
    import Select, { type Option } from "#lib/components/ui/Select.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import { actionConfig, actorLabel, describeAction, type AuditEntry } from "#lib/config/auditLog.js";
    import type { Role } from "#lib/config/roles.js";
    import { cn, formatDateTime, formatRelativeTime } from "#lib/utils.js";
    import { PUBLIC_SERVER_URL } from "$app/env/public";
    import {
        getAnalyticsAdminActivity,
        getAnalyticsAuditTrend,
        getAnalyticsCwlSeasonOverview,
        getAnalyticsCwlSeasons,
        getAnalyticsOverview,
        getAnalyticsUserJoins,
        getAuditLog,
        type GetAnalyticsAdminActivity200,
        type GetAnalyticsCwlSeasonOverview200,
        type GetAnalyticsOverview200,
    } from "@repo/clashofclans-client";
    import { curveMonotoneX } from "d3-shape";
    import { AreaChart, BarChart } from "layerchart";
    import { onMount } from "svelte";
    import TablerArrowUpRight from "~icons/tabler/arrow-up-right";
    import TablerLock from "~icons/tabler/lock";
    import TablerLockOpen from "~icons/tabler/lock-open";
    import TablerTool from "~icons/tabler/tool";
    import type { PageProps } from "./$types";

    type Overview = GetAnalyticsOverview200["data"];
    type CwlSeason = GetAnalyticsCwlSeasonOverview200["data"];
    type Actor = GetAnalyticsAdminActivity200["data"]["data"][number];
    type DailyPoint = { date: Date; count: number };

    let { data }: PageProps = $props();
    const session = authClient.useSession();
    const opts = { baseURL: PUBLIC_SERVER_URL, credentials: "include" as const };

    const JOIN_DAYS = 30;
    const AUDIT_DAYS = 14;
    const ACTIVITY_DAYS = 30;

    let overview = $state<Overview | null>(null);
    // The stat strip always describes the current season; the CWL panel can browse others.
    let currentSeason = $state<CwlSeason | null>(null);
    let season = $state<CwlSeason | null>(null);
    let seasonOptions = $state<Option[]>([]);
    let seasonValue = $state("");
    let seasonLoading = $state(false);
    let joins = $state<DailyPoint[] | null>(null);
    let auditTrend = $state<DailyPoint[] | null>(null);
    let actors = $state<Actor[] | null>(null);
    let recent = $state<AuditEntry[] | null>(null);
    const AREA_SKELETON_SHAPE =
        "polygon(0 72%, 8% 60%, 17% 66%, 26% 48%, 35% 55%, 45% 38%, 55% 46%, 64% 30%, 74% 42%, 84% 26%, 92% 34%, 100% 22%, 100% 100%, 0 100%)";
    // Until the first round of requests settles, nulls mean "loading", not "nothing there".
    let loaded = $state(false);

    const canSeeAudit = $derived(!!data.permissions?.manage);
    const daily = (points: { date: string; count: number }[]) => points.map((p) => ({ date: new Date(p.date), count: p.count }));
    const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const fmt = (n: number | null | undefined) => (n == null ? "–" : n.toLocaleString("en-US"));
    const sum = (points: DailyPoint[] | null) => points?.reduce((t, p) => t + p.count, 0) ?? null;

    onMount(async () => {
        const [o, s, list, j, a, act, log] = await Promise.allSettled([
            getAnalyticsOverview(opts),
            getAnalyticsCwlSeasonOverview(undefined, opts),
            getAnalyticsCwlSeasons(opts),
            getAnalyticsUserJoins({ days: JOIN_DAYS }, opts),
            getAnalyticsAuditTrend({ days: AUDIT_DAYS }, opts),
            getAnalyticsAdminActivity({ limit: 8, days: ACTIVITY_DAYS }, opts),
            canSeeAudit ? getAuditLog({ limit: 6 }, opts) : Promise.reject(),
        ]);
        if (o.status === "fulfilled" && o.value.success) overview = o.value.data;
        if (s.status === "fulfilled" && s.value.success) {
            currentSeason = season = s.value.data;
            if (s.value.data.seasonId != null) seasonValue = String(s.value.data.seasonId);
        }
        if (list.status === "fulfilled" && list.value.success)
            seasonOptions = list.value.data.seasons.map((x) => ({ label: x.name, value: String(x.id) }));
        if (j.status === "fulfilled" && j.value.success) joins = daily(j.value.data.data);
        if (a.status === "fulfilled" && a.value.success) auditTrend = daily(a.value.data.data);
        if (act.status === "fulfilled" && act.value.success) actors = act.value.data.data;
        if (log.status === "fulfilled" && log.value.success) recent = log.value.data.entries;
        loaded = true;
    });

    async function loadSeason(value: string) {
        if (!value) return;
        seasonLoading = true;
        try {
            const resp = await getAnalyticsCwlSeasonOverview({ seasonId: Number(value) }, opts);
            if (resp.success) season = resp.data;
        } catch {
            // keep the previous season on screen
        } finally {
            seasonLoading = false;
        }
    }

    const unassigned = $derived(currentSeason ? currentSeason.applications - currentSeason.assigned : null);
    const seasonUnassigned = $derived(season ? season.applications - season.assigned : 0);
    const placedClans = $derived(season?.byClan.filter((c) => c.count > 0) ?? []);
    const emptyClans = $derived((season?.byClan.length ?? 0) - placedClans.length);
    const clanMax = $derived(Math.max(1, seasonUnassigned, ...placedClans.map((c) => c.count)));
    const townHalls = $derived(season?.byTownHall.map((t) => ({ th: t.townHall ? `TH${t.townHall}` : "N/A", count: t.count })).reverse() ?? []);
    // A band axis labels every bar, which crowds 14 dates; label every third day ending today.
    const auditTicks = $derived(auditTrend?.filter((_, i) => (auditTrend!.length - 1 - i) % 3 === 0).map((p) => p.date) ?? []);
    const actorMax = $derived(Math.max(1, ...(actors?.map((a) => a.count) ?? [])));
    const participation = $derived(
        currentSeason && overview?.users.total ? Math.round((currentSeason.applicants / overview.users.total) * 100) : null,
    );

    type Stat = {
        label: string;
        href: string;
        value: number | null | undefined;
        // Shown muted after the value, as in "312 / 329".
        of?: number;
        valueClass?: string;
        meter?: { value: number; max: number; color: string };
        spark?: DailyPoint[] | null;
        note: string;
        noteStrong?: string;
        noteClass?: string;
    };
    const stats = $derived<Stat[]>([
        {
            label: "Join applications",
            href: "/admin/join-applications",
            value: overview?.pendingJoinApplications,
            valueClass: overview?.pendingJoinApplications ? "text-amber-300" : undefined,
            note: overview ? (overview.pendingJoinApplications ? "pending review" : "nothing pending") : "",
        },
        {
            label: "CWL placed",
            href: "/admin/cwl-applications",
            value: currentSeason?.assigned,
            of: currentSeason?.applications,
            meter: currentSeason
                ? { value: currentSeason.assigned, max: currentSeason.applications, color: unassigned ? "bg-amber-400" : "bg-green-500" }
                : undefined,
            noteStrong: unassigned ? fmt(unassigned) : undefined,
            noteClass: "text-amber-300",
            note: currentSeason ? (unassigned ? " still unassigned" : "everyone placed") : "",
        },
        {
            label: "CWL applicants",
            href: "/admin/cwl-applications",
            value: currentSeason?.applicants,
            meter: currentSeason && overview ? { value: currentSeason.applicants, max: overview.users.total, color: "bg-blue-500" } : undefined,
            noteStrong: participation != null ? `${participation}%` : undefined,
            noteClass: "text-stone-300",
            note: participation != null ? " of users applied" : "",
        },
        {
            label: "Bonuses awarded",
            href: "/admin/bonus",
            value: currentSeason?.bonuses,
            note: currentSeason?.seasonName ?? "",
        },
        {
            label: "Users",
            href: "/admin/users",
            value: overview?.users.total,
            spark: joins,
            noteStrong: overview ? `+${fmt(overview.users.newLast30d)}` : undefined,
            noteClass: "text-green-400",
            note: overview ? ` in ${JOIN_DAYS} days` : "",
        },
        {
            label: "CoC accounts",
            href: "/admin/coc-accounts",
            value: overview?.cocAccounts.total,
            noteStrong: overview ? fmt(overview.cocAccounts.external) : undefined,
            noteClass: "text-stone-300",
            note: overview ? " external" : "",
        },
    ]);

    const ICON_ACCENT: Record<string, string> = {
        blue: "text-blue-400",
        green: "text-green-400",
        red: "text-red-400",
        yellow: "text-yellow-400",
        ghost: "text-stone-400",
    };
</script>

<Seo title="Admin Panel" description="Admin control panel" />

{#snippet bar(value: number, max: number, color: string)}
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
        <div class={cn("h-full rounded-full", color)} style:width="{(value / max) * 100}%"></div>
    </div>
{/snippet}

{#snippet sparkline(points: DailyPoint[])}
    {@const max = Math.max(1, ...points.map((p) => p.count))}
    {@const step = 96 / Math.max(1, points.length - 1)}
    {@const line = points.map((p, i) => `${(i * step).toFixed(1)},${(30 - (p.count / max) * 28).toFixed(1)}`).join(" ")}
    <svg viewBox="0 0 96 32" preserveAspectRatio="none" class="h-8 max-w-24 min-w-0 flex-1 overflow-visible" aria-hidden="true">
        <polygon points="0,32 {line} 96,32" class="fill-green-500/15" />
        <polyline points={line} fill="none" class="stroke-green-500" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    </svg>
{/snippet}

{#snippet link(href: string, label: string)}
    <a {href} class="flex items-center gap-1 text-xs font-medium text-stone-400 transition-colors hover:text-stone-100">
        {label}
        <TablerArrowUpRight class="size-3.5" />
    </a>
{/snippet}

{#snippet chartSkeleton(bars: number)}
    <div class="flex h-full min-h-48 items-end gap-1.5 pt-4" aria-hidden="true">
        {#each { length: bars }, i (i)}
            <div class="flex-1 skeleton rounded-b-none" style:height="{30 + ((i * 37) % 60)}%"></div>
        {/each}
    </div>
{/snippet}

{#snippet areaSkeleton()}
    <div class="flex h-full min-h-48 pt-4" aria-hidden="true">
        <div class="flex-1 skeleton rounded-none" style:clip-path={AREA_SKELETON_SHAPE}></div>
    </div>
{/snippet}

{#snippet actorsSkeleton()}
    <ol class="flex flex-col gap-3" aria-hidden="true">
        {#each { length: 8 }, i (i)}
            <li class="flex items-center gap-3">
                <span class="flex w-4 shrink-0 justify-end"><span class="h-3 w-2 skeleton"></span></span>
                <div class="size-10 shrink-0 skeleton rounded-full"></div>
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <div class="flex h-5 items-center justify-between gap-2">
                        <div class="h-3.5 skeleton" style:width="{40 + ((i * 23) % 35)}%"></div>
                        <div class="h-3.5 w-6 skeleton"></div>
                    </div>
                    <div class="h-1.5 skeleton rounded-full" style:width="{90 - i * 9}%"></div>
                    <div class="flex h-4 items-center"><div class="h-3 w-24 skeleton"></div></div>
                </div>
            </li>
        {/each}
    </ol>
{/snippet}

{#snippet recentSkeleton()}
    <ul class="flex flex-col divide-y divide-stone-800" aria-hidden="true">
        {#each { length: 6 }, i (i)}
            <li class="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0">
                <div class="mt-0.5 size-4 shrink-0 skeleton rounded"></div>
                <div class="flex min-w-0 flex-1 flex-col">
                    <div class="flex h-5 items-center"><div class="h-3.5 skeleton" style:width="{55 + ((i * 23) % 40)}%"></div></div>
                    <div class="flex h-4 items-center"><div class="h-3 w-2/5 skeleton"></div></div>
                </div>
            </li>
        {/each}
    </ul>
{/snippet}

{#snippet empty(text: string)}
    <p class="grid h-full min-h-24 place-items-center text-sm text-stone-500">{text}</p>
{/snippet}

<div class="flex size-full flex-col gap-6">
    <PageHeader title="Admin Panel">
        {#snippet subtitle()}
            Welcome back, <span class="text-stone-200">{$session.data?.user?.name?.split(" ")[0] ?? ""}</span>.
        {/snippet}
        {#snippet actions()}
            {#if !loaded}
                <div class="h-6.5 w-34 skeleton rounded-lg"></div>
                <div class="h-6.5 w-24 skeleton rounded-lg"></div>
            {:else if overview}
                {#if overview.status.maintenance}
                    <Badge variant="red" size="button" icon={TablerTool} content="Maintenance mode" />
                {/if}
                <Badge
                    variant={overview.status.applicationsEnabled ? "green" : "ghost"}
                    size="button"
                    icon={overview.status.applicationsEnabled ? TablerLockOpen : TablerLock}
                    content="Applications {overview.status.applicationsEnabled ? 'open' : 'closed'}"
                />
                <Badge
                    variant={overview.status.cwlEnabled ? "green" : "ghost"}
                    size="button"
                    icon={overview.status.cwlEnabled ? TablerLockOpen : TablerLock}
                    content="CWL {overview.status.cwlEnabled ? 'open' : 'closed'}"
                />
            {/if}
        {/snippet}
    </PageHeader>

    <div class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border-2 border-stone-700/50 bg-stone-700/50 md:grid-cols-3 2xl:grid-cols-6">
        {#each stats as stat (stat.label)}
            <a href={stat.href} class="flex min-w-0 flex-col gap-3 bg-stone-900 p-4 transition-colors hover:bg-stone-800/60">
                <span class="truncate text-xs font-medium text-stone-400">{stat.label}</span>
                <div class="flex items-end justify-between gap-3">
                    {#if !loaded}
                        <span class="flex h-8 items-center"><span class="block h-7 w-16 skeleton"></span></span>
                    {:else}
                        <span class={cn("text-3xl leading-none font-bold text-stone-50 tabular-nums", stat.valueClass)}>
                            {fmt(stat.value)}{#if stat.of != null}<span class="text-base font-medium text-stone-500"> / {fmt(stat.of)}</span>{/if}
                        </span>
                    {/if}
                    {#if stat.spark?.length}
                        {@render sparkline(stat.spark)}
                    {/if}
                </div>
                <div class="mt-auto flex flex-col gap-2">
                    {#if stat.meter}
                        {@render bar(stat.meter.value, Math.max(1, stat.meter.max), stat.meter.color)}
                    {/if}
                    {#if !loaded}
                        <!-- Stats that carry a meter declare the key even before their data arrives. -->
                        {#if "meter" in stat}
                            <span class="block h-1.5 skeleton rounded-full"></span>
                        {/if}
                        <span class="flex h-4 items-center"><span class="block h-3 w-24 skeleton"></span></span>
                    {:else}
                        <span class="truncate text-xs text-stone-500">
                            {#if stat.noteStrong}<span class={cn("font-medium", stat.noteClass)}>{stat.noteStrong}</span>{/if}{stat.note || " "}
                        </span>
                    {/if}
                </div>
            </a>
        {/each}
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
        <Panel
            title="CWL season"
            subtitle={season ? `${fmt(season.applications)} accounts · ${fmt(season.applicants)} users` : null}
            subtitleLoading={!loaded}
            class="xl:col-span-2"
        >
            {#snippet actions()}
                {#if !loaded}
                    <div class="h-10 w-40 skeleton rounded-lg"></div>
                {:else if seasonOptions.length}
                    <Select
                        class="w-40"
                        options={seasonOptions}
                        bind:value={seasonValue}
                        onValueChange={loadSeason}
                        placeholder="Season"
                        disabled={seasonLoading}
                    />
                {/if}
            {/snippet}
            {#if !loaded}
                <div class="grid flex-1 gap-6 md:grid-cols-2" aria-busy="true">
                    <div class="flex flex-col gap-3">
                        <div class="flex h-4 items-center"><div class="h-3 w-28 skeleton"></div></div>
                        <ul class="flex flex-col gap-2">
                            {#each { length: 14 }, i (i)}
                                <li class="grid h-5 grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3">
                                    <div class="h-3.5 skeleton" style:width="{60 + ((i * 17) % 35)}%"></div>
                                    <div class="h-1.5 skeleton rounded-full" style:width="{30 + ((i * 29) % 65)}%"></div>
                                    <div class="ml-auto h-3.5 w-5 skeleton"></div>
                                </li>
                            {/each}
                        </ul>
                    </div>
                    <div class="flex flex-col gap-3">
                        <div class="flex h-4 items-center"><div class="h-3 w-28 skeleton"></div></div>
                        <div class="min-h-56 flex-1">{@render chartSkeleton(8)}</div>
                    </div>
                </div>
            {:else if !season}
                {@render empty(currentSeason === null && overview ? "No CWL season set" : "")}
            {:else if season.applications === 0 && season.byClan.length === 0}
                {@render empty("No applications this season")}
            {:else}
                <div class={cn("grid flex-1 gap-6 md:grid-cols-2", seasonLoading && "opacity-60")}>
                    <div class="flex min-w-0 flex-col gap-3">
                        <h3 class="text-xs font-medium text-stone-400">Placement by clan</h3>
                        <ul class="flex flex-col gap-2 text-sm">
                            {#each placedClans as clan (clan.tag)}
                                <li class="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3" title="{clan.name} · {clan.league}">
                                    <span class="truncate text-stone-200">{clan.name}</span>
                                    {@render bar(clan.count, clanMax, "bg-blue-500")}
                                    <span class="text-right font-medium text-stone-100 tabular-nums">{clan.count}</span>
                                </li>
                            {/each}
                            <li class="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3">
                                <span class="text-stone-400 italic">Unassigned</span>
                                {@render bar(seasonUnassigned, clanMax, "bg-amber-400")}
                                <span class={cn("text-right font-medium tabular-nums", seasonUnassigned ? "text-amber-300" : "text-stone-500")}>
                                    {seasonUnassigned}
                                </span>
                            </li>
                        </ul>
                        {#if emptyClans}
                            <p class="text-xs text-stone-500">{emptyClans} more {emptyClans === 1 ? "clan has" : "clans have"} nobody placed</p>
                        {/if}
                    </div>
                    <div class="flex min-w-0 flex-col gap-3">
                        <h3 class="text-xs font-medium text-stone-400">Town halls applied</h3>
                        {#if townHalls.length}
                            <div class="min-h-56 flex-1">
                                <BarChart
                                    data={townHalls}
                                    x="th"
                                    y="count"
                                    series={[{ key: "count", label: "Accounts", color: "var(--color-blue-500)" }]}
                                    props={{ bars: { radius: 3, rounded: "top" } }}
                                />
                            </div>
                        {:else}
                            {@render empty("No applications")}
                        {/if}
                    </div>
                </div>
            {/if}
        </Panel>

        <Panel title="Admin activity" subtitle="Actions in the last {ACTIVITY_DAYS} days">
            {#snippet actions()}
                {#if canSeeAudit}
                    {@render link("/admin/audit-log", "Audit log")}
                {/if}
            {/snippet}
            {#if !loaded}
                {@render actorsSkeleton()}
            {:else if actors === null}
                {@render empty("")}
            {:else if actors.length === 0}
                {@render empty("No admin actions yet")}
            {:else}
                <ol class="flex flex-col gap-3">
                    {#each actors as actor, i (actor.actorId)}
                        <li class="flex items-center gap-3">
                            <span class="w-4 shrink-0 text-right text-xs text-stone-500 tabular-nums">{i + 1}</span>
                            <Avatar src={actor.image} name={actor.name} role={actor.role as Role | null} size="sm" />
                            <div class="flex min-w-0 flex-1 flex-col gap-1">
                                <div class="flex items-baseline justify-between gap-2 text-sm">
                                    <span class="truncate text-stone-200">{actor.name}</span>
                                    <span class="font-medium text-stone-100 tabular-nums">{actor.count}</span>
                                </div>
                                {@render bar(actor.count, actorMax, "bg-green-500")}
                                {#if actor.topActions[0]}
                                    <span class="truncate text-xs text-stone-500">{actionConfig(actor.topActions[0].action).label}</span>
                                {/if}
                            </div>
                        </li>
                    {/each}
                </ol>
            {/if}
        </Panel>
    </div>

    <div class={cn("grid gap-4", recent || (!loaded && canSeeAudit) ? "xl:grid-cols-3" : "lg:grid-cols-2")}>
        <Panel title="New users" subtitle={joins ? `${fmt(sum(joins))} in the last ${JOIN_DAYS} days` : null} subtitleLoading={!loaded}>
            <div class="min-h-48 flex-1">
                {#if !loaded}
                    {@render areaSkeleton()}
                {:else if joins}
                    <AreaChart
                        data={joins}
                        x="date"
                        y="count"
                        series={[{ key: "count", label: "Users", color: "var(--color-green-500)" }]}
                        props={{
                            area: { curve: curveMonotoneX, fillOpacity: 0.2, line: { curve: curveMonotoneX, strokeWidth: 2 } },
                            xAxis: { format: shortDate },
                            tooltip: { header: { format: shortDate } },
                        }}
                    />
                {/if}
            </div>
        </Panel>

        <Panel
            title="Admin actions"
            subtitle={auditTrend ? `${fmt(sum(auditTrend))} in the last ${AUDIT_DAYS} days` : null}
            subtitleLoading={!loaded}
        >
            <div class="min-h-48 flex-1">
                {#if !loaded}
                    {@render chartSkeleton(14)}
                {:else if auditTrend}
                    <BarChart
                        data={auditTrend}
                        x="date"
                        y="count"
                        series={[{ key: "count", label: "Actions", color: "var(--color-blue-500)" }]}
                        props={{
                            bars: { radius: 3, rounded: "top" },
                            xAxis: { format: shortDate, ticks: auditTicks },
                            tooltip: { header: { format: shortDate } },
                        }}
                    />
                {/if}
            </div>
        </Panel>

        {#if !loaded && canSeeAudit}
            <Panel title="Recent activity">
                {#snippet actions()}
                    <div class="h-4 w-14 skeleton"></div>
                {/snippet}
                {@render recentSkeleton()}
            </Panel>
        {:else if recent}
            <Panel title="Recent activity">
                {#snippet actions()}
                    {@render link("/admin/audit-log", "View all")}
                {/snippet}
                {#if recent.length === 0}
                    {@render empty("Nothing logged yet")}
                {:else}
                    <ul class="flex flex-col divide-y divide-stone-800">
                        {#each recent as entry (entry.id)}
                            {@const cfg = actionConfig(entry.action)}
                            <li class="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0">
                                <cfg.icon class={cn("mt-0.5 size-4 shrink-0", ICON_ACCENT[cfg.variant] ?? ICON_ACCENT.ghost)} />
                                <div class="flex min-w-0 flex-1 flex-col">
                                    <span class="truncate text-sm text-stone-200" title={describeAction(entry)}>{describeAction(entry)}</span>
                                    <span class="truncate text-xs text-stone-500" title={formatDateTime(entry.createdAt)}>
                                        {actorLabel(entry)} · {formatRelativeTime(entry.createdAt)}
                                    </span>
                                </div>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </Panel>
        {/if}
    </div>
</div>
