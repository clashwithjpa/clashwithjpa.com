<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CwlClanFormSidebar from "$lib/components/CwlClanFormSidebar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { Sidebar } from "$lib/components/ui/sidebar";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import {
        createAdminCwlClan,
        deleteAdminCwlClan,
        getAdminCwlClans,
        syncAdminCwlClanLeagues,
        type CreateAdminCwlClan400,
        type CreateAdminCwlClan401,
        type CreateAdminCwlClan409,
        type CreateAdminCwlClan500,
        type DeleteAdminCwlClan401,
        type DeleteAdminCwlClan404,
        type DeleteAdminCwlClan500,
        type GetAdminCwlClans200,
        type SyncAdminCwlClanLeagues401,
        type SyncAdminCwlClanLeagues500,
    } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerPlus from "~icons/tabler/plus";
    import TablerRefresh from "~icons/tabler/refresh";
    import TablerShield from "~icons/tabler/shield";
    import TablerTrash from "~icons/tabler/trash";
    import TablerX from "~icons/tabler/x";

    type CwlClan = GetAdminCwlClans200["data"]["clans"][number];

    let clans = $state<CwlClan[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let syncing = $state(false);
    let removing = $state<string | null>(null);
    let searchText = $state("");

    let clanSidebar: Sidebar | null = $state(null);
    // Name, league and leader are auto-managed (fetched on add, refreshed on sync),
    // so the only thing a manager enters is the tag.
    let form = $state({ cocClanTag: "" });

    function errMsg(error: unknown, fallback: string) {
        return typeof error === "string" ? error : fallback;
    }

    let filteredClans = $derived(
        clans.filter(
            (clan) =>
                clan.cocClanName.toLowerCase().includes(searchText.toLowerCase()) ||
                clan.cocClanTag.toLowerCase().includes(searchText.toLowerCase()) ||
                clan.cocClanLeader.toLowerCase().includes(searchText.toLowerCase()),
        ),
    );

    async function load() {
        loading = true;
        try {
            const resp = await getAdminCwlClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                clans = resp.data.clans;
            } else {
                toast.error("Failed to load CWL clans");
            }
        } catch (e: any) {
            toast.error("Failed to load CWL clans", { description: e?.message });
        } finally {
            loading = false;
        }
    }

    async function syncLeagues() {
        syncing = true;
        try {
            const resp = (await syncAdminCwlClanLeagues({ baseURL: PUBLIC_SERVER_URL, credentials: "include" })) as
                | Awaited<ReturnType<typeof syncAdminCwlClanLeagues>>
                | SyncAdminCwlClanLeagues401
                | SyncAdminCwlClanLeagues500;
            if (resp.success) {
                clans = resp.data.clans;
                const { updated, unchanged, failed } = resp.data;
                toast.success(`Leagues synced: ${updated} updated, ${unchanged} unchanged${failed ? `, ${failed} failed` : ""}`);
            } else {
                toast.error(errMsg(resp.error, "Failed to sync leagues"));
            }
        } catch (e: any) {
            toast.error("Failed to sync leagues", { description: e?.message });
        } finally {
            syncing = false;
        }
    }

    function resetForm() {
        form = { cocClanTag: "" };
    }

    function openAdd() {
        resetForm();
        clanSidebar?.open("add");
    }

    function closeSidebar() {
        clanSidebar?.close();
        resetForm();
    }

    async function createClan() {
        let tag = form.cocClanTag.trim().toUpperCase();
        if (tag && !tag.startsWith("#")) tag = `#${tag}`;

        if (!tag || tag === "#") {
            toast.error("Clan tag is required");
            return;
        }

        saving = true;
        try {
            // Name, league and leader are fetched server-side from the CoC API.
            // Widen to the error variants so we can read the server's message (e.g. invalid/duplicate tag).
            const resp = (await createAdminCwlClan(
                { cocClanTag: tag },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            )) as
                | Awaited<ReturnType<typeof createAdminCwlClan>>
                | CreateAdminCwlClan400
                | CreateAdminCwlClan401
                | CreateAdminCwlClan409
                | CreateAdminCwlClan500;
            if (resp.success) {
                clans = [...clans, resp.data.clan].sort((a, b) => a.cocClanTag.localeCompare(b.cocClanTag));
                toast.success(`Added ${resp.data.clan.cocClanName}`);
                closeSidebar();
            } else {
                toast.error(errMsg(resp.error, "Failed to add CWL clan"));
            }
        } catch (e: any) {
            toast.error("Failed to add CWL clan", { description: e?.message });
        } finally {
            saving = false;
        }
    }

    async function removeClan(tag: string) {
        removing = tag;
        try {
            const resp = (await deleteAdminCwlClan(encodeURIComponent(tag), { baseURL: PUBLIC_SERVER_URL, credentials: "include" })) as
                | Awaited<ReturnType<typeof deleteAdminCwlClan>>
                | DeleteAdminCwlClan401
                | DeleteAdminCwlClan404
                | DeleteAdminCwlClan500;
            if (resp.success) {
                clans = clans.filter((c) => c.cocClanTag !== tag);
                toast.success("CWL clan removed");
            } else {
                toast.error(errMsg(resp.error, "Failed to remove CWL clan"));
            }
        } catch (e: any) {
            toast.error("Failed to remove CWL clan", { description: e?.message });
        } finally {
            removing = null;
        }
    }

    load();
</script>

<Seo title="CWL Clans" description="Add or remove CWL clans" />

<div in:fadeIn class="flex size-full flex-col gap-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
            <h1 class="text-2xl font-bold">CWL Clans</h1>
            <p class="text-sm text-stone-400">Add or remove the clans available for Clan War League assignments.</p>
        </div>
        {#if !loading}
            <div class="flex items-center gap-2">
                {#if clans.length > 0}
                    <Input placeholder="Search by clan name, tag, or leader..." bind:value={searchText} class="min-w-0 flex-1 sm:w-64 sm:flex-none" />
                {/if}
                <Button
                    variant="ghost"
                    onclick={syncLeagues}
                    disabled={syncing || clans.length === 0}
                    class="shrink-0"
                    tooltip="Fetch the latest league info from the CoC API"
                    tooltipPlacement="bottom"
                >
                    <span class="flex items-center gap-2">
                        {#if syncing}
                            <SvgSpinnersRingResize class="size-5 shrink-0 lg:size-4" /> <span class="hidden lg:inline">Syncing...</span>
                        {:else}
                            <TablerRefresh class="size-5 shrink-0 lg:size-4" /> <span class="hidden lg:inline">Sync leagues</span>
                        {/if}
                    </span>
                </Button>
                <Button onclick={openAdd} class="shrink-0" tooltip="Add a new CWL clan by its tag (e.g. #CLANTAG)" tooltipPlacement="bottom">
                    <span class="flex items-center gap-2"
                        ><TablerPlus class="size-5 shrink-0 lg:size-4" /> <span class="hidden lg:inline">Add CWL Clan</span></span
                    >
                </Button>
            </div>
        {/if}
    </div>

    {#if loading}
        <div class="flex flex-1 items-center justify-center pt-10 text-stone-400">
            <SvgSpinnersBlocksScale class="size-12 lg:size-16" />
        </div>
    {:else if clans.length === 0}
        <div class="flex flex-1 flex-col items-center justify-center gap-3 pt-10 text-stone-400">
            <TablerShield class="size-12 lg:size-16" />
            <p class="text-sm">No CWL clans yet. Add one to get started.</p>
        </div>
    {:else if filteredClans.length === 0}
        <div class="flex flex-1 flex-col items-center justify-center gap-3 pt-10 text-stone-400">
            <TablerX class="size-12 lg:size-16" />
            <p class="text-sm">No clans match your search.</p>
        </div>
    {:else}
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {#each filteredClans as clan (clan.cocClanTag)}
                <div
                    use:cardSlideIn
                    class="@container flex h-full flex-col justify-between gap-3 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4"
                >
                    <div class="flex min-w-0 gap-3">
                        <TablerShield class="mt-0.5 size-6 shrink-0 text-stone-400" />
                        <div class="min-w-0 flex-1">
                            <h3 class="truncate font-semibold text-stone-50">
                                {clan.cocClanName}
                            </h3>
                            <p class="truncate text-xs text-stone-400">{clan.cocClanTag}</p>
                            <p class="mt-1 text-xs text-stone-400">{clan.cocClanLeague}</p>
                            <p class="truncate text-xs text-stone-400">Leader: {clan.cocClanLeader}</p>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <ConfirmationDialog
                            class="w-full min-w-0"
                            title="Remove CWL Clan"
                            description={`Removing ${clan.cocClanName} (${clan.cocClanTag}) will also delete any CWL applications assigned to it for the season. This cannot be undone.`}
                            confirmText="Remove"
                            onConfirm={() => removeClan(clan.cocClanTag)}
                        >
                            <Button variant="danger" size="sm" class="w-full min-w-0" disabled={removing === clan.cocClanTag}>
                                {#if removing === clan.cocClanTag}
                                    <span class="flex items-center justify-center gap-2">
                                        <SvgSpinnersRingResize class="size-4 shrink-0" /> Removing
                                    </span>
                                {:else}
                                    <span class="flex items-center justify-center gap-2">
                                        <TablerTrash class="size-4 shrink-0" /> Remove
                                    </span>
                                {/if}
                            </Button>
                        </ConfirmationDialog>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<Sidebar bind:this={clanSidebar}>
    <CwlClanFormSidebar bind:form {saving} onSubmit={createClan} onCancel={closeSidebar} />
</Sidebar>
