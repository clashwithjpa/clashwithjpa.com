<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { formatDate, formatDateTime } from "$lib/utils";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import { getJoinApplications, updateJoinApplicationStatus, type GetJoinApplications200 } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerCheck from "~icons/tabler/check";
    import TablerHammer from "~icons/tabler/hammer";
    import TablerTrophy from "~icons/tabler/trophy";
    import TablerX from "~icons/tabler/x";

    type Application = GetJoinApplications200["data"]["applications"][number];
    type Status = Application["status"];

    let applications = $state<Application[]>([]);
    let total = $state(0);
    let loading = $state(true);
    let statusFilter = $state<string>("");
    let processingId = $state<number | null>(null);

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
                applications = applications.map((a) => (a.id === id ? resp.data.application : a));
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

    $effect(() => {
        statusFilter; // track for reactivity
        load();
    });

    function getPlayer(app: Application) {
        const p = app.cocAccountData as any;
        return {
            name: p?.name ?? "Unknown",
            townHall: p?.townHallLevel ?? null,
            builderHall: p?.builderHallLevel ?? null,
            trophies: p?.trophies ?? null,
            clan: p?.clan?.name as string | undefined,
            clanBadge: p?.clan?.badgeUrls?.small as string | undefined,
        };
    }

    const statusVariant: Record<Status, "yellow" | "green" | "red"> = {
        pending: "yellow",
        accepted: "green",
        rejected: "red",
    };
</script>

<Seo title="Join Applications" description="Review pending clan join applications" />

<div in:fadeIn class="flex size-full flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold">Join Applications</h1>
            <p class="text-sm text-stone-400">
                {total} application{total === 1 ? "" : "s"}
                {statusFilter ? `with status "${statusFilter}"` : "total"}
            </p>
        </div>
        <div class="w-full max-w-xs">
            <Select bind:value={statusFilter} options={statusOptions} placeholder="Filter by status" />
        </div>
    </div>

    <div class="flex-1">
        {#if loading}
            <div class="flex size-full items-center justify-center text-stone-400">
                <SvgSpinnersBlocksScale class="size-12" />
            </div>
        {:else if applications.length === 0}
            <div class="flex size-full flex-col items-center justify-center gap-2 text-stone-400">
                <TablerX class="size-12" />
                <span>No applications found</span>
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {#each applications as app (app.id)}
                    {@const p = getPlayer(app)}
                    <div in:fadeIn use:cardSlideIn class="flex min-w-0 flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
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
                            <Badge variant={statusVariant[app.status]} content={app.status} />
                        </div>

                        <div class="flex flex-wrap gap-1">
                            {#if p.clan}
                                <Badge variant="blue" content={p.clan} icon={p.clanBadge} iconSize="size-4" />
                            {/if}
                            {#if p.trophies != null}
                                <Badge variant="ghost" content={String(p.trophies)} icon={TablerTrophy} />
                            {/if}
                            {#if p.builderHall != null}
                                <Badge variant="yellow" content="BH {p.builderHall}" icon={TablerHammer} />
                            {/if}
                        </div>

                        <div class="flex flex-col gap-1 text-sm text-stone-400">
                            <div class="flex items-center gap-1">
                                <SimpleIconsDiscord class="size-4" />
                                <span class="font-mono text-xs">{app.discordUserId}</span>
                            </div>
                            <span class="text-xs" title={formatDateTime(app.createdAt)}>Applied {formatDate(app.createdAt)}</span>
                        </div>

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
                            <Button variant="ghost" class="w-full" disabled={processingId === app.id} onclick={() => updateStatus(app.id, "pending")}>
                                Mark Pending
                            </Button>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
