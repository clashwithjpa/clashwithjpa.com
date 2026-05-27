<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { formatDateTime } from "$lib/utils";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import { getAuditLog, type GetAuditLog200 } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerChevronLeft from "~icons/tabler/chevron-left";
    import TablerChevronRight from "~icons/tabler/chevron-right";
    import TablerX from "~icons/tabler/x";

    type AuditEntry = GetAuditLog200["data"]["entries"][number];

    const PAGE_SIZE = 50;

    let entries = $state<AuditEntry[]>([]);
    let total = $state(0);
    let loading = $state(true);
    let actionFilter = $state<string>("");
    let targetTypeFilter = $state<string>("");
    let actorIdFilter = $state<string>("");
    let page = $state(0);
    let expanded = $state<Record<number, boolean>>({});

    const actionOptions: Option[] = [
        { label: "All actions", value: "" },
        { label: "Clan application — created", value: "clan_application.create" },
        { label: "Clan application — accepted", value: "clan_application.accepted" },
        { label: "Clan application — rejected", value: "clan_application.rejected" },
        { label: "Clan application — pending", value: "clan_application.pending" },
        { label: "CWL application — created", value: "cwl_application.create" },
        { label: "CWL application — assigned", value: "cwl_application.assign" },
        { label: "CWL application — unassigned", value: "cwl_application.unassign" },
        { label: "Settings — updated", value: "settings.update" },
        { label: "Rules — updated", value: "rules.update" },
        { label: "Clan — created", value: "clan.create" },
        { label: "Clan — updated", value: "clan.update" },
        { label: "Clan — deleted", value: "clan.delete" },
        { label: "CWL clan — created", value: "cwl_clan.create" },
        { label: "CWL clan — updated", value: "cwl_clan.update" },
        { label: "CWL clan — deleted", value: "cwl_clan.delete" },
        { label: "COC account — imported", value: "coc_account.import" },
    ];

    const targetTypeOptions: Option[] = [
        { label: "All targets", value: "" },
        { label: "Clan applications", value: "clan_application" },
        { label: "CWL applications", value: "cwl_application" },
        { label: "Settings", value: "settings" },
        { label: "Rules", value: "rules" },
        { label: "Clans", value: "clan" },
        { label: "CWL clans", value: "cwl_clan" },
        { label: "COC accounts", value: "coc_account" },
    ];

    async function load() {
        loading = true;
        try {
            const resp = await getAuditLog(
                {
                    limit: PAGE_SIZE,
                    offset: page * PAGE_SIZE,
                    action: actionFilter || undefined,
                    targetType: targetTypeFilter || undefined,
                    actorId: actorIdFilter.trim() || undefined,
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
            );
            if (resp.success) {
                entries = resp.data.entries;
                total = resp.data.total;
            } else {
                toast.error("Failed to load audit log");
            }
        } catch (e: any) {
            toast.error("Failed to load audit log", { description: e?.message });
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        actionFilter;
        targetTypeFilter;
        page;
        load();
    });

    function actorLabel(e: AuditEntry) {
        return e.actorCurrentName ?? e.actorName ?? (e.actorId ? `user ${e.actorId.slice(0, 8)}` : "system");
    }

    function describe(e: AuditEntry): string {
        const actor = actorLabel(e);
        const m = (e.metadata ?? {}) as Record<string, any>;
        switch (e.action) {
            case "clan_application.create":
                return `${actor} submitted a clan application with ${m.cocAccountTag ?? "?"}`;
            case "clan_application.accepted":
                return `${actor} accepted clan application from ${m.cocAccountTag ?? "?"}`;
            case "clan_application.rejected":
                return `${actor} rejected clan application from ${m.cocAccountTag ?? "?"}`;
            case "clan_application.pending":
                return `${actor} marked clan application from ${m.cocAccountTag ?? "?"} as pending`;
            case "cwl_application.create":
                return `${actor} submitted a CWL application with ${m.cocAccountTag ?? "?"} (pref #${m.preferenceNum ?? "?"}${m.isAlt ? ", alt" : ""})`;
            case "cwl_application.assign":
                return `${actor} assigned ${m.cocAccountTag ?? "?"} to CWL clan ${m.assignedClanTag ?? "?"}`;
            case "cwl_application.unassign":
                return `${actor} unassigned CWL application for ${m.cocAccountTag ?? "?"}`;
            case "settings.update": {
                const parts: string[] = [];
                if (m.booleans && typeof m.booleans === "object") {
                    for (const [k, v] of Object.entries(m.booleans as Record<string, boolean>)) {
                        parts.push(`${k} → ${v ? "on" : "off"}`);
                    }
                }
                if (Array.isArray(m.fields) && m.fields.length) {
                    parts.push(`updated ${m.fields.join(", ")}`);
                }
                return parts.length ? `${actor} changed settings: ${parts.join("; ")}` : `${actor} updated settings`;
            }
            case "rules.update":
                return `${actor} updated the rules`;
            case "clan.create":
                return `${actor} created clan ${m.cocClanCode ?? ""} (${m.cocClanTag ?? "?"})`;
            case "clan.update":
                return Array.isArray(m.fields) && m.fields.length
                    ? `${actor} updated clan ${m.cocClanCode ?? "?"} (${m.fields.join(", ")})`
                    : `${actor} updated clan ${m.cocClanCode ?? "?"}`;
            case "clan.delete":
                return `${actor} deleted clan ${m.cocClanCode ?? ""} (${m.cocClanTag ?? "?"})`;
            case "cwl_clan.create":
                return `${actor} created CWL clan ${m.cocClanName ?? ""} (${m.cocClanTag ?? "?"})`;
            case "cwl_clan.update":
                return Array.isArray(m.fields) && m.fields.length
                    ? `${actor} updated CWL clan ${m.cocClanTag ?? "?"} (${m.fields.join(", ")})`
                    : `${actor} updated CWL clan ${m.cocClanTag ?? "?"}`;
            case "cwl_clan.delete":
                return `${actor} deleted CWL clan ${m.cocClanName ?? ""} (${m.cocClanTag ?? "?"})`;
            case "coc_account.import":
                return `${actor} imported ${m.count ?? "?"} COC account${m.count === 1 ? "" : "s"}`;
            default:
                return `${actor} ${e.action}${e.targetType ? ` on ${e.targetType}` : ""}${e.targetId ? ` #${e.targetId}` : ""}`;
        }
    }

    function resetFilters() {
        actionFilter = "";
        targetTypeFilter = "";
        actorIdFilter = "";
        page = 0;
    }

    const totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));
</script>

<Seo title="Audit Log" description="View server actions audit log" />

<div in:fadeIn class="flex size-full flex-col gap-4 overflow-hidden">
    <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold">Audit Log</h1>
            <p class="text-sm text-stone-400">{total} entr{total === 1 ? "y" : "ies"} recorded</p>
        </div>
        <div class="flex flex-wrap items-end gap-2">
            <div class="w-56">
                <Select bind:value={actionFilter} options={actionOptions} placeholder="Filter action" />
            </div>
            <div class="w-44">
                <Select bind:value={targetTypeFilter} options={targetTypeOptions} placeholder="Filter target" />
            </div>
            <div class="w-56">
                <Input bind:value={actorIdFilter} placeholder="Filter by actor ID" onkeydown={(e: KeyboardEvent) => e.key === "Enter" && load()} />
            </div>
            <Button variant="ghost" onclick={resetFilters}>Reset</Button>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto">
        {#if loading}
            <div class="flex size-full items-center justify-center text-stone-400">
                <SvgSpinnersBlocksScale class="size-12" />
            </div>
        {:else if entries.length === 0}
            <div class="flex size-full flex-col items-center justify-center gap-2 text-stone-400">
                <TablerX class="size-12" />
                <span>No audit entries found</span>
            </div>
        {:else}
            <div class="flex flex-col gap-2">
                {#each entries as entry (entry.id)}
                    <div in:fadeIn use:cardSlideIn class="flex flex-col gap-1 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-3">
                        <div class="flex flex-wrap items-baseline justify-between gap-2">
                            <span class="text-sm text-stone-100">{describe(entry)}</span>
                            <span class="font-mono text-xs text-stone-500">{formatDateTime(entry.createdAt)}</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                            <span class="rounded bg-stone-800 px-1.5 py-0.5 font-mono">{entry.action}</span>
                            {#if entry.targetType}
                                <span class="font-mono">{entry.targetType}{entry.targetId ? `#${entry.targetId}` : ""}</span>
                            {/if}
                            {#if entry.metadata && Object.keys(entry.metadata).length > 0}
                                <button class="text-stone-400 hover:text-stone-200" onclick={() => (expanded[entry.id] = !expanded[entry.id])}>
                                    {expanded[entry.id] ? "hide" : "show"} details
                                </button>
                            {/if}
                        </div>
                        {#if expanded[entry.id] && entry.metadata}
                            <pre class="mt-1 overflow-x-auto rounded bg-stone-950 p-2 text-xs text-stone-300">{JSON.stringify(
                                    entry.metadata,
                                    null,
                                    2,
                                )}</pre>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    {#if !loading && total > PAGE_SIZE}
        <div class="flex items-center justify-center gap-2">
            <Button variant="ghost" disabled={page === 0} onclick={() => (page = Math.max(0, page - 1))}>
                <TablerChevronLeft class="size-4" /> Prev
            </Button>
            <span class="text-sm text-stone-400">Page {page + 1} / {totalPages}</span>
            <Button variant="ghost" disabled={page + 1 >= totalPages} onclick={() => (page = page + 1)}>
                Next <TablerChevronRight class="size-4" />
            </Button>
        </div>
    {/if}
</div>
