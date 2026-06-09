<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import RoleBadge from "$lib/components/ui/RoleBadge.svelte";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import type { Role } from "$lib/config/roles";
    import { formatDate, formatDateTime } from "$lib/utils";
    import { fadeIn } from "$lib/utils/animations";
    import {
        clearAcceptedJoinApplications,
        deleteJoinApplication,
        getJoinApplications,
        updateJoinApplicationStatus,
        type GetJoinApplications200,
    } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerBolt from "~icons/tabler/bolt";
    import TablerCheck from "~icons/tabler/check";
    import TablerClock from "~icons/tabler/clock";
    import TablerHammer from "~icons/tabler/hammer";
    import TablerStar from "~icons/tabler/star";
    import TablerTrash from "~icons/tabler/trash";
    import TablerTrophy from "~icons/tabler/trophy";
    import TablerX from "~icons/tabler/x";

    type Application = GetJoinApplications200["data"]["applications"][number];
    type Status = Application["status"];

    let applications = $state<Application[]>([]);
    let total = $state(0);
    let loading = $state(true);
    let statusFilter = $state<string>("");
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
            const resp = await getJoinApplications(
                {
                    status: (statusFilter || undefined) as Status | undefined,
                    limit: 100,
                    offset: 0,
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
            );
            if (resp.success) {
                applications = resp.data.applications;
                total = resp.data.total;
            } else {
                toast.error("Failed to load applications");
            }
        } catch (e: any) {
            toast.error("Failed to load applications", { description: e?.message });
        } finally {
            loading = false;
        }
    }

    async function updateStatus(id: number, status: Status) {
        processingId = id;
        try {
            const resp = await updateJoinApplicationStatus(
                id,
                { status },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                // The update response omits the joined Discord profile fields; keep the existing ones.
                applications = applications.map((a) => (a.id === id ? { ...a, ...resp.data.application } : a));
                toast.success(`Application ${status}`);
                if (statusFilter && status !== statusFilter) {
                    applications = applications.filter((a) => a.id !== id);
                    total = Math.max(0, total - 1);
                }
            } else {
                toast.error("Failed to update application");
            }
        } catch (e: any) {
            toast.error("Failed to update application", { description: e?.message });
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
            const resp = await deleteJoinApplication(id, { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                applications = applications.filter((a) => a.id !== id);
                total = Math.max(0, total - 1);
                toast.success("Application deleted");
            } else {
                toast.error("Failed to delete application");
            }
        } catch (e: any) {
            toast.error("Failed to delete application", { description: e?.message });
        } finally {
            processingId = null;
        }
    }

    async function clearAccepted() {
        clearingAccepted = true;
        try {
            const resp = await clearAcceptedJoinApplications({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                toast.success(`Cleared ${resp.data.deleted} accepted application${resp.data.deleted === 1 ? "" : "s"}`);
                await load();
            } else {
                toast.error("Failed to clear accepted applications");
            }
        } catch (e: any) {
            toast.error("Failed to clear accepted applications", { description: e?.message });
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
            clan: p?.clan?.name as string | undefined,
            clanBadge: p?.clan?.badgeUrls?.small as string | undefined,
            league: p?.leagueTier?.name as string | undefined,
            leagueIcon: p?.leagueTier?.iconUrls?.small as string | undefined,
        };
    }

    const statusVariant: Record<Status, "yellow" | "green" | "red"> = {
        pending: "yellow",
        accepted: "green",
        rejected: "red",
    };
</script>

<Seo title="Join Applications" description="Review pending clan join applications" />

{#snippet statTile(icon: typeof TablerTrophy, label: string, value: string)}
    {@const Cmp = icon}
    <div class="flex flex-col gap-0.5 rounded-lg bg-stone-800 px-3 py-2">
        <div class="flex items-center gap-1 text-xs text-stone-400">
            <Cmp class="size-3.5 shrink-0" />
            <span class="truncate">{label}</span>
        </div>
        <span class="truncate font-mono text-sm font-medium text-stone-200">{value}</span>
    </div>
{/snippet}

<div in:fadeIn class="flex size-full flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold">Join Applications</h1>
            <p class="text-sm text-stone-400">
                {total} application{total === 1 ? "" : "s"}
                {statusFilter ? `with status "${statusFilter}"` : "total"}
            </p>
        </div>
        <div class="flex w-full items-center gap-2 sm:w-auto">
            <div class="flex-1 sm:w-64">
                <Select bind:value={statusFilter} options={statusOptions} placeholder="Filter by status" />
            </div>
            <ConfirmationDialog
                title="Clear accepted applications?"
                description="Permanently delete all accepted clan join applications. This cannot be undone."
                confirmText="Clear accepted"
                onConfirm={clearAccepted}
            >
                <Button variant="danger" class="shrink-0 gap-1" disabled={clearingAccepted}>
                    {#if clearingAccepted}
                        <SvgSpinnersRingResize class="size-4" />
                    {:else}
                        <TablerTrash class="size-4" />
                    {/if}
                    Clear accepted
                </Button>
            </ConfirmationDialog>
        </div>
    </div>

    <div class="flex-1">
        {#if loading}
            <div class="flex size-full items-center justify-center pt-10 text-stone-400">
                <SvgSpinnersBlocksScale class="size-12 lg:size-16" />
            </div>
        {:else if applications.length === 0}
            <div class="flex size-full flex-col items-center justify-center gap-2 pt-10 text-stone-400">
                <TablerX class="size-12 lg:size-16" />
                <span>No applications found</span>
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {#each applications as app (app.id)}
                    {@const p = getPlayer(app)}
                    <div class="flex h-full min-w-0 flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex min-w-0 items-start gap-3">
                                {#if p.townHall}
                                    <Icon name="th/{p.townHall}" class="size-12 shrink-0" />
                                {/if}
                                <div class="min-w-0 flex-1">
                                    <span class="block truncate text-lg font-bold text-stone-50">{p.name}</span>
                                    <span class="block truncate font-mono text-xs text-stone-400">{app.cocAccountTag}</span>
                                </div>
                            </div>
                            <div class="flex shrink-0 items-center gap-2">
                                <Badge variant={statusVariant[app.status]} content={app.status} />
                                <Button
                                    size="icon"
                                    variant="danger"
                                    disabled={processingId === app.id}
                                    tooltip="Delete application"
                                    tooltipPlacement="bottom"
                                    onclick={() => requestDelete(app)}
                                >
                                    {#if processingId === app.id}
                                        <SvgSpinnersRingResize class="size-4" />
                                    {:else}
                                        <TablerTrash class="size-4" />
                                    {/if}
                                </Button>
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-1">
                            {#if p.clan}
                                <Tooltip title="Clan: {p.clan}" placement="top">
                                    <Badge variant="blue" content={p.clan} icon={p.clanBadge} iconSize="size-4" />
                                </Tooltip>
                            {/if}
                            {#if p.league}
                                <Tooltip title="League: {p.league}" placement="top">
                                    <Badge variant="ghost" content={p.league} icon={p.leagueIcon} iconSize="size-4" />
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

                        <!-- Extra stats, evenly sized -->
                        <div class="grid grid-cols-3 gap-2">
                            {@render statTile(TablerTrophy, "Trophies", p.trophies != null ? p.trophies.toLocaleString() : "—")}
                            {@render statTile(TablerStar, "War stars", p.warStars != null ? p.warStars.toLocaleString() : "—")}
                            {@render statTile(TablerBolt, "Level", p.expLevel != null ? String(p.expLevel) : "—")}
                        </div>

                        <Tooltip title={formatDateTime(app.createdAt)} placement="left">
                            <div class="flex items-center gap-1 text-xs text-stone-400">
                                <TablerClock class="size-3.5 shrink-0" />
                                <span>Applied {formatDate(app.createdAt)}</span>
                            </div>
                        </Tooltip>

                        <!-- Actions pinned to the bottom so every card aligns -->
                        <div class="mt-auto">
                            {#if app.status === "pending"}
                                <div class="flex gap-2">
                                    <Button
                                        variant="success"
                                        class="flex-1 gap-1"
                                        disabled={processingId === app.id}
                                        onclick={() => updateStatus(app.id, "accepted")}
                                    >
                                        <TablerCheck class="size-4" /> Accept
                                    </Button>
                                    <Button
                                        variant="danger"
                                        class="flex-1 gap-1"
                                        disabled={processingId === app.id}
                                        onclick={() => updateStatus(app.id, "rejected")}
                                    >
                                        <TablerX class="size-4" /> Reject
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
>
    {#snippet children()}{/snippet}
</ConfirmationDialog>
