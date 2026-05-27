<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Badge from "$lib/components/ui/Badge.svelte";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { formatDate, formatDateTime } from "$lib/utils";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import { assignCwlApplication, getCwlApplications, getJPACwlClans, type GetCwlApplications200 } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerListNumbers from "~icons/tabler/list-numbers";
    import TablerScale from "~icons/tabler/scale";
    import TablerUsersPlus from "~icons/tabler/users-plus";
    import TablerX from "~icons/tabler/x";

    type Application = GetCwlApplications200["data"]["applications"][number];

    const now = new Date();
    const currentMonth = now.toLocaleString("en-US", { month: "long" });
    const currentYear = now.getFullYear();

    let applications = $state<Application[]>([]);
    let clanOptions = $state<Option[]>([{ label: "Unassigned", value: "" }]);
    let total = $state(0);
    let loading = $state(true);
    let filterMode = $state<string>("all");
    let processingId = $state<number | null>(null);

    const filterOptions: Option[] = [
        { label: "All", value: "all" },
        { label: "Unassigned", value: "unassigned" },
        { label: "Assigned", value: "assigned" },
    ];

    async function loadClans() {
        try {
            const resp = await getJPACwlClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                clanOptions = [
                    { label: "Unassigned", value: "" },
                    ...Object.values(resp.data.clans).map((c) => ({ label: `${c.clanName} (${c.clanTag})`, value: c.clanTag })),
                ];
            }
        } catch {
            // ignore - selectors will still work without options
        }
    }

    async function load() {
        loading = true;
        try {
            const resp = await getCwlApplications(
                {
                    month: currentMonth,
                    year: currentYear,
                    unassigned: filterMode === "unassigned" ? true : undefined,
                    limit: 200,
                    offset: 0,
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
            );
            if (resp.success) {
                let list = resp.data.applications;
                if (filterMode === "assigned") list = list.filter((a) => a.assignedTo);
                applications = list;
                total = resp.data.total;
            } else {
                toast.error("Failed to load CWL applications");
            }
        } catch (e: any) {
            toast.error("Failed to load CWL applications", { description: e?.message });
        } finally {
            loading = false;
        }
    }

    async function assign(id: number, clanTag: string) {
        processingId = id;
        try {
            const resp = await assignCwlApplication(
                id,
                { clanTag: clanTag || null },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                applications = applications.map((a) => (a.id === id ? resp.data.application : a));
                toast.success(clanTag ? "Application assigned" : "Application unassigned");
            } else {
                toast.error("Failed to assign application");
            }
        } catch (e: any) {
            toast.error("Failed to assign application", { description: e?.message });
        } finally {
            processingId = null;
        }
    }

    loadClans();
    $effect(() => {
        filterMode; // track
        load();
    });
</script>

<Seo title="CWL Applications" description="Manage CWL applications and assign players to clans" />

<div in:fadeIn class="flex size-full flex-col gap-4 overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold">CWL Applications</h1>
            <p class="text-sm text-stone-400">
                {currentMonth}
                {currentYear} &mdash; {total} application{total === 1 ? "" : "s"}
            </p>
        </div>
        <div class="w-full max-w-xs">
            <Select bind:value={filterMode} options={filterOptions} placeholder="Filter" />
        </div>
    </div>

    <div class="flex-1 overflow-y-auto">
        {#if loading}
            <div class="flex size-full items-center justify-center text-stone-400">
                <SvgSpinnersBlocksScale class="size-12" />
            </div>
        {:else if applications.length === 0}
            <div class="flex size-full flex-col items-center justify-center gap-2 text-stone-400">
                <TablerX class="size-12" />
                <span>No CWL applications found</span>
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {#each applications as app (app.id)}
                    <div in:fadeIn use:cardSlideIn class="flex min-w-0 flex-col gap-3 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0 flex-1">
                                <span class="block truncate text-lg font-bold text-stone-50">{app.cocAccountName}</span>
                                <span class="block truncate font-mono text-xs text-stone-400">{app.cocAccountTag}</span>
                            </div>
                            {#if app.isAlt}
                                <Badge variant="yellow" content="Alt" icon={TablerUsersPlus} />
                            {/if}
                        </div>

                        <div class="flex flex-wrap gap-1">
                            {#if app.cocAccountClan}
                                <Badge variant="ghost" content={app.cocAccountClan} />
                            {/if}
                            <Badge variant="ghost" content="Pref. {app.preferenceNum}" icon={TablerListNumbers} />
                            <Badge variant="ghost" content={app.cocAccountWeight.toLocaleString()} icon={TablerScale} />
                        </div>

                        <div class="flex flex-col gap-1 text-xs text-stone-400">
                            <div class="flex items-center gap-1">
                                <SimpleIconsDiscord class="size-3.5" />
                                <span>{app.discordUsername}</span>
                                <span class="font-mono">({app.discordUserId})</span>
                            </div>
                            <span title={formatDateTime(app.appliedAt)}>Applied {formatDate(app.appliedAt)}</span>
                        </div>

                        <div class="flex flex-col gap-1">
                            <span class="text-xs font-medium text-stone-400">Assigned clan</span>
                            <Select
                                value={app.assignedTo ?? ""}
                                options={clanOptions}
                                placeholder="Assign to..."
                                disabled={processingId === app.id}
                                onValueChange={(val: string) => assign(app.id, val)}
                            />
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
