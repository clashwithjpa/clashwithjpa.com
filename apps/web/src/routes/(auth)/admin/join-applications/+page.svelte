<script lang="ts">
    /* eslint-disable @typescript-eslint/no-explicit-any */
    import Avatar from "#lib/components/ui/Avatar.svelte";
    import Badge from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import ConfirmationDialog from "#lib/components/ui/ConfirmationDialog.svelte";
    import PageHeader from "#lib/components/ui/PageHeader.svelte";
    import RoleBadge from "#lib/components/ui/RoleBadge.svelte";
    import type { Option } from "#lib/components/ui/Select.svelte";
    import Select from "#lib/components/ui/Select.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import Spinner from "#lib/components/ui/Spinner.svelte";
    import Tooltip from "#lib/components/ui/Tooltip.svelte";
    import TownHall from "#lib/components/ui/TownHall.svelte";
    import type { Role } from "#lib/config/roles.js";
    import { toast } from "#lib/toast.js";
    import { errorMessage, formatDateTime, formatRelativeTime } from "#lib/utils.js";
    import {
        clearAcceptedJoinApplications,
        deleteJoinApplication,
        getJoinApplications,
        updateJoinApplicationStatus,
        type GetJoinApplicationsStatus200,
    } from "@repo/clashofclans-client";
    import TablerBolt from "~icons/tabler/bolt";
    import TablerCheck from "~icons/tabler/check";
    import TablerClock from "~icons/tabler/clock";
    import TablerExternalLink from "~icons/tabler/external-link";
    import TablerHammer from "~icons/tabler/hammer";
    import TablerMoneybag from "~icons/tabler/moneybag";
    import TablerStar from "~icons/tabler/star";
    import TablerTrash from "~icons/tabler/trash";
    import TablerTrophy from "~icons/tabler/trophy";
    import TablerX from "~icons/tabler/x";

    let { data }: { data: { canDelete: boolean } } = $props();

    type Application = GetJoinApplicationsStatus200["data"]["applications"][number];
    type Status = Application["status"];

    let applications = $state<Application[]>([]);
    // Each card mounts several ark-ui tooltips, so 100 of them in one go blocked the main
    // thread for ~600ms and froze the status dropdown mid-fade. Cards render a batch per frame.
    const REVEAL_BATCH = 4;
    let revealed = $state(REVEAL_BATCH);
    let revealRun = 0;
    let shownApplications = $derived(applications.slice(0, revealed));
    let total = $state(0);
    let loading = $state(true);
    let statusFilter = $state<string>("pending");
    let processingId = $state<number | null>(null);
    let clearingAccepted = $state(false);
    // A single shared delete dialog is reused for every card so we don't mount
    // one ark-ui Dialog (+ its matchMedia listener) per application.
    let deleteOpen = $state(false);
    let deleteTarget = $state<Application | null>(null);

    const statusOptions: Option[] = [
        { label: "All", value: "" },
        { label: "Pending", value: "pending" },
        { label: "Accepted", value: "accepted" },
        { label: "Rejected", value: "rejected" },
    ];

    async function load() {
        loading = true;
        try {
            const resp = await getJoinApplications({
                query: {
                    status: (statusFilter || undefined) as Status | undefined,
                    limit: 100,
                    offset: 0,
                },
            });
            if (resp.data) {
                applications = resp.data.data.applications;
                total = resp.data.data.total;
                revealInBatches();
            } else {
                toast.error("Failed to load applications");
            }
        } catch (e) {
            toast.error("Failed to load applications", { description: errorMessage(e) });
        } finally {
            loading = false;
        }
    }

    function revealInBatches() {
        const run = ++revealRun;
        revealed = REVEAL_BATCH;
        const step = () => {
            if (run !== revealRun || revealed >= applications.length) return;
            revealed += REVEAL_BATCH;
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    async function updateStatus(id: number, status: Status) {
        processingId = id;
        try {
            const resp = await updateJoinApplicationStatus({ path: { id }, body: { status } });
            if (resp.data) {
                // The update response omits the joined Discord profile fields; keep the existing ones.
                applications = applications.map((a) => (a.id === id ? { ...a, ...resp.data.data.application } : a));
                toast.success(`Application ${status}`);
                if (statusFilter && status !== statusFilter) {
                    applications = applications.filter((a) => a.id !== id);
                    total = Math.max(0, total - 1);
                }
            } else {
                toast.error("Failed to update application");
            }
        } catch (e) {
            toast.error("Failed to update application", { description: errorMessage(e) });
        } finally {
            processingId = null;
        }
    }

    function requestDelete(app: Application) {
        deleteTarget = app;
        deleteOpen = true;
    }

    async function deleteApplication(id: number) {
        processingId = id;
        try {
            const resp = await deleteJoinApplication({ path: { id } });
            if (resp.data) {
                applications = applications.filter((a) => a.id !== id);
                total = Math.max(0, total - 1);
                toast.success("Application deleted");
            } else {
                toast.error("Failed to delete application");
            }
        } catch (e) {
            toast.error("Failed to delete application", { description: errorMessage(e) });
        } finally {
            processingId = null;
        }
    }

    async function clearAccepted() {
        clearingAccepted = true;
        try {
            const resp = await clearAcceptedJoinApplications({});
            if (resp.data) {
                toast.success(`Cleared ${resp.data.data.deleted} accepted application${resp.data.data.deleted === 1 ? "" : "s"}`);
                await load();
            } else {
                toast.error("Failed to clear accepted applications");
            }
        } catch (e) {
            toast.error("Failed to clear accepted applications", { description: errorMessage(e) });
        } finally {
            clearingAccepted = false;
        }
    }

    $effect(() => {
        statusFilter; // track
        load();
    });

    function getPlayer(app: Application) {
        const p = app.cocAccountData as any;
        return {
            name: p?.name ?? "Unknown",
            townHall: p?.townHallLevel ?? null,
            builderHall: p?.builderHallLevel ?? null,
            trophies: p?.trophies ?? null,
            warStars: p?.warStars ?? null,
            expLevel: p?.expLevel ?? null,
            donations: p?.achievements?.find((a: any) => a.name === "Friend in Need")?.value ?? null,
            clan: p?.clan?.name as string | undefined,
            clanBadge: p?.clan?.badgeUrls?.small as string | undefined,
            league: p?.leagueTier?.name as string | undefined,
            leagueIcon: p?.leagueTier?.iconUrls?.small as string | undefined,
        };
    }

    // The stat tiles sit in a 3-column grid; stretch the final tile to fill
    // whatever columns are left in its row so the block is always flush right
    // (4 → 3 + 1 full-width, 5 → 3 + [1, 2], 6 → 3 + 3).
    function lastTileSpan(count: number): string {
        const fill = 3 - ((count - 1) % 3);
        return fill === 3 ? "col-span-3" : fill === 2 ? "col-span-2" : "";
    }

    const statusVariant: Record<Status, "yellow" | "green" | "red"> = {
        pending: "yellow",
        accepted: "green",
        rejected: "red",
    };
</script>

<Seo title="Join Applications" description="Review pending clan join applications" />

{#snippet statTile(icon: typeof TablerTrophy, label: string, value: string, spanClass = "")}
    {@const Cmp = icon}
    <div class="flex min-w-0 flex-col gap-0.5 rounded-lg bg-stone-800 px-3 py-2 {spanClass}">
        <div class="flex items-center gap-1 text-xs text-stone-400">
            <Cmp class="size-3.5 shrink-0" />
            <span class="truncate">{label}</span>
        </div>
        <span class="truncate font-mono text-sm font-medium text-stone-200">{value}</span>
    </div>
{/snippet}

<div class="flex size-full flex-col gap-4">
    <PageHeader title="Join Applications" subtitleLoading={loading}>
        {#snippet subtitle()}
            {total} application{total === 1 ? "" : "s"}
            {statusFilter ? `with status "${statusFilter}"` : "total"}
        {/snippet}
        {#snippet actions()}
            <Select bind:value={statusFilter} options={statusOptions} placeholder="Filter by status" class="min-w-40 flex-1 @4xl:max-w-64" />
            {#if data.canDelete}
                <ConfirmationDialog
                    title="Clear accepted applications?"
                    description="Permanently delete all accepted clan join applications. This cannot be undone."
                    confirmText="Clear accepted"
                    onConfirm={clearAccepted}
                >
                    <Button variant="danger" class="shrink-0 gap-1" disabled={clearingAccepted}>
                        {#if clearingAccepted}
                            <Spinner class="size-5" />
                        {:else}
                            <TablerTrash class="size-5" />
                        {/if}
                        Clear accepted
                    </Button>
                </ConfirmationDialog>
            {/if}
        {/snippet}
    </PageHeader>

    <div class="flex-1">
        {#if loading}
            <div class="card-grid [--card-min:22rem]" aria-busy="true">
                {#each { length: 6 }, i (i)}
                    <div class="flex flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex min-w-0 flex-1 items-start gap-3">
                                <div class="size-12 shrink-0 skeleton rounded-lg"></div>
                                <div class="flex min-w-0 flex-1 flex-col">
                                    <div class="flex h-7 items-center"><div class="h-5 w-36 max-w-full skeleton"></div></div>
                                    <div class="flex h-4 items-center"><div class="h-3 w-24 skeleton"></div></div>
                                </div>
                            </div>
                            <div class="flex shrink-0 gap-2">
                                <div class="h-5.5 w-16 skeleton rounded-full"></div>
                                {#if data.canDelete}
                                    <div class="size-10 skeleton rounded-lg"></div>
                                {/if}
                            </div>
                        </div>
                        <div class="flex gap-1">
                            <div class="h-6.5 w-28 skeleton rounded-full"></div>
                            <div class="h-6.5 w-32 skeleton rounded-full"></div>
                            <div class="h-6.5 w-14 skeleton rounded-full"></div>
                        </div>
                        <div class="flex items-center gap-3 border-t border-stone-700/50 pt-3">
                            <div class="size-10 shrink-0 skeleton rounded-full"></div>
                            <div class="flex flex-1 flex-col gap-1">
                                <div class="flex h-5.5 items-center gap-1.5">
                                    <div class="h-3.5 w-24 skeleton"></div>
                                    <div class="h-5 w-16 skeleton rounded-full"></div>
                                </div>
                                <div class="flex h-4 items-center"><div class="h-3 w-36 skeleton"></div></div>
                            </div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            {#each { length: 4 }, j (j)}
                                <div class="flex flex-col gap-0.5 rounded-lg bg-stone-800 px-3 py-2 {j === 3 ? 'col-span-3' : ''}">
                                    <div class="flex h-4 items-center"><div class="h-3 w-14 skeleton"></div></div>
                                    <div class="flex h-5 items-center"><div class="h-3.5 w-10 skeleton"></div></div>
                                </div>
                            {/each}
                        </div>
                        <div class="flex h-4 items-center"><div class="h-3 w-32 skeleton"></div></div>
                        <div class="mt-auto flex flex-col gap-2">
                            <div class="h-10 skeleton rounded-lg"></div>
                            <div class="h-10 skeleton rounded-lg"></div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else if applications.length === 0}
            <div class="flex size-full flex-col items-center justify-center gap-2 pt-10 text-stone-400">
                <TablerX class="size-12 lg:size-16" />
                <span>No applications found</span>
            </div>
        {:else}
            <div class="card-grid [--card-min:22rem]">
                {#each shownApplications as app, i (app.id)}
                    {@const p = getPlayer(app)}
                    {@const stats = [
                        { icon: TablerTrophy, label: "Trophies", value: p.trophies != null ? p.trophies.toLocaleString() : "—" },
                        { icon: TablerStar, label: "War stars", value: p.warStars != null ? p.warStars.toLocaleString() : "—" },
                        { icon: TablerBolt, label: "Level", value: p.expLevel != null ? String(p.expLevel) : "—" },
                        { icon: TablerMoneybag, label: "FN (Donations)", value: p.donations != null ? p.donations.toLocaleString() : "—" },
                    ]}
                    <!-- content-visibility skips layout/paint (and pauses animations) for
                         off-screen cards, so scrolling stays smooth as the list grows. -->
                    <div
                        class="stagger-card flex h-full min-w-0 flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4 [contain-intrinsic-size:auto_360px] [content-visibility:auto]"
                        style="--i:{i}"
                    >
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex min-w-0 items-start gap-3">
                                {#if p.townHall}
                                    <TownHall level={p.townHall} class="size-12 shrink-0" />
                                {/if}
                                <div class="min-w-0 flex-1">
                                    <span class="block truncate text-lg font-bold text-stone-50">{p.name}</span>
                                    <span class="block truncate font-mono text-xs text-stone-400">{app.cocAccountTag}</span>
                                </div>
                            </div>
                            <div class="flex shrink-0 items-center gap-2">
                                <Badge variant={statusVariant[app.status]} content={app.status} />
                                {#if data.canDelete}
                                    <Button
                                        size="icon"
                                        variant="danger"
                                        disabled={processingId === app.id}
                                        tooltip="Delete application"
                                        tooltipPlacement="bottom"
                                        onclick={() => requestDelete(app)}
                                    >
                                        {#if processingId === app.id}
                                            <Spinner />
                                        {:else}
                                            <TablerTrash />
                                        {/if}
                                    </Button>
                                {/if}
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-1">
                            {#if p.clan}
                                <Tooltip title="Clan: {p.clan}" placement="top">
                                    <Badge variant="blue" content={p.clan} icon={p.clanBadge} iconSize="size-5" />
                                </Tooltip>
                            {/if}
                            {#if p.league}
                                <Tooltip title="League: {p.league}" placement="top">
                                    <Badge variant="ghost" content={p.league} icon={p.leagueIcon} iconSize="size-5" />
                                </Tooltip>
                            {/if}
                            {#if p.builderHall != null}
                                <Tooltip title="Builder Hall {p.builderHall}" placement="top">
                                    <Badge variant="yellow" content="BH {p.builderHall}" icon={TablerHammer} />
                                </Tooltip>
                            {/if}
                        </div>

                        <!-- User info (mirrors UserCell) -->
                        <div class="flex items-center gap-3 border-t border-stone-700/50 pt-3">
                            <Avatar
                                src={app.image}
                                name={app.discordUsername || "Unknown"}
                                role={(app.discordRole as Role) || "unverified"}
                                size="sm"
                            />
                            <div class="flex min-w-0 flex-1 flex-col justify-center gap-1">
                                <div class="flex items-center gap-1.5">
                                    <span class="truncate text-sm font-medium text-stone-200">{app.discordUsername || "Unknown"}</span>
                                    <RoleBadge role={(app.discordRole as Role) || "unverified"} />
                                </div>
                                <span class="truncate font-mono text-xs text-stone-400">{app.discordUserId}</span>
                            </div>
                        </div>

                        <!-- Extra stats: last tile fills its row so the block stays flush -->
                        <div class="grid grid-cols-3 gap-2">
                            {#each stats as stat, i (stat.label)}
                                {@render statTile(stat.icon, stat.label, stat.value, i === stats.length - 1 ? lastTileSpan(stats.length) : "")}
                            {/each}
                        </div>

                        <Tooltip title={formatDateTime(app.createdAt)} placement="top">
                            <div class="flex items-center gap-1 text-xs text-stone-400">
                                <TablerClock class="size-3.5 shrink-0" />
                                <span>Applied {formatRelativeTime(app.createdAt)}</span>
                            </div>
                        </Tooltip>

                        <!-- Actions pinned to the bottom so every card aligns -->
                        <div class="mt-auto flex flex-col gap-2">
                            <Button
                                variant="base"
                                href="https://cc.fwafarm.com/cc_n/member.php?tag={app.cocAccountTag.replace('#', '')}"
                                target="_blank"
                                class="w-full gap-2"
                            >
                                <TablerExternalLink class="size-5" /> CC Info
                            </Button>
                            {#if app.status === "pending"}
                                <div class="flex gap-2">
                                    <Button
                                        variant="success"
                                        class="flex-1 gap-1"
                                        disabled={processingId === app.id}
                                        onclick={() => updateStatus(app.id, "accepted")}
                                    >
                                        <TablerCheck class="size-5" /> Accept
                                    </Button>
                                    <Button
                                        variant="danger"
                                        class="flex-1 gap-1"
                                        disabled={processingId === app.id}
                                        onclick={() => updateStatus(app.id, "rejected")}
                                    >
                                        <TablerX class="size-5" /> Reject
                                    </Button>
                                </div>
                            {:else}
                                <Button
                                    variant="ghost"
                                    class="w-full"
                                    disabled={processingId === app.id}
                                    onclick={() => updateStatus(app.id, "pending")}
                                >
                                    Mark Pending
                                </Button>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- One shared, programmatically-opened delete dialog for all cards. -->
<ConfirmationDialog
    bind:open={deleteOpen}
    title="Delete application?"
    description={deleteTarget
        ? `Permanently delete the join application from ${getPlayer(deleteTarget).name} (${deleteTarget.cocAccountTag}). This cannot be undone.`
        : ""}
    confirmText="Delete"
    onConfirm={() => deleteTarget && deleteApplication(deleteTarget.id)}
></ConfirmationDialog>
