<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Dialog from "$lib/components/ui/Dialog.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import {
        createAdminCwlClan,
        deleteAdminCwlClan,
        getAdminCwlClans,
        syncAdminCwlClanLeagues,
        updateAdminCwlClan,
        type CreateAdminCwlClan401,
        type CreateAdminCwlClan409,
        type CreateAdminCwlClan500,
        type DeleteAdminCwlClan401,
        type DeleteAdminCwlClan404,
        type DeleteAdminCwlClan500,
        type GetAdminCwlClans200,
        type SyncAdminCwlClanLeagues401,
        type SyncAdminCwlClanLeagues500,
        type UpdateAdminCwlClan401,
        type UpdateAdminCwlClan404,
        type UpdateAdminCwlClan500,
        type UpdateAdminCwlClanMutationRequest,
    } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerPencil from "~icons/tabler/pencil";
    import TablerPlus from "~icons/tabler/plus";
    import TablerRefresh from "~icons/tabler/refresh";
    import TablerShield from "~icons/tabler/shield";
    import TablerTrash from "~icons/tabler/trash";

    type CwlClan = GetAdminCwlClans200["data"]["clans"][number];

    let clans = $state<CwlClan[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let syncing = $state(false);
    let removing = $state<string | null>(null);
    let searchText = $state("");

    let dialogOpen = $state(false);
    // null = adding a new clan; otherwise the (immutable) tag of the clan being edited.
    let editingTag = $state<string | null>(null);
    let form = $state({ cocClanTag: "", cocClanName: "", cocClanLeague: "", cocClanLeader: "" });

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
                toast.success(`Leagues synced — ${updated} updated, ${unchanged} unchanged${failed ? `, ${failed} failed` : ""}`);
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
        form = { cocClanTag: "", cocClanName: "", cocClanLeague: "", cocClanLeader: "" };
    }

    function openAdd() {
        editingTag = null;
        resetForm();
        dialogOpen = true;
    }

    function openEdit(clan: CwlClan) {
        editingTag = clan.cocClanTag;
        form = {
            cocClanTag: clan.cocClanTag,
            cocClanName: clan.cocClanName,
            cocClanLeague: clan.cocClanLeague,
            cocClanLeader: clan.cocClanLeader,
        };
        dialogOpen = true;
    }

    function submit() {
        if (editingTag === null) createClan();
        else updateClan(editingTag);
    }

    async function createClan() {
        // Normalize the tag: clans tags are uppercase and prefixed with '#'.
        let tag = form.cocClanTag.trim().toUpperCase();
        if (tag && !tag.startsWith("#")) tag = `#${tag}`;
        const name = form.cocClanName.trim();
        const league = form.cocClanLeague.trim();
        const leader = form.cocClanLeader.trim();

        if (!tag || tag === "#" || !name || !league || !leader) {
            toast.error("All fields are required");
            return;
        }

        saving = true;
        try {
            // The fetch client returns the parsed body without throwing, so widen the
            // type to the error variants to read the server's message (e.g. duplicate tag).
            const resp = (await createAdminCwlClan(
                { cocClanTag: tag, cocClanName: name, cocClanLeague: league, cocClanLeader: leader },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            )) as Awaited<ReturnType<typeof createAdminCwlClan>> | CreateAdminCwlClan401 | CreateAdminCwlClan409 | CreateAdminCwlClan500;
            if (resp.success) {
                clans = [...clans, resp.data.clan].sort((a, b) => a.cocClanTag.localeCompare(b.cocClanTag));
                toast.success(`Added ${resp.data.clan.cocClanName}`);
                resetForm();
            } else {
                toast.error(errMsg(resp.error, "Failed to add CWL clan"));
            }
        } catch (e: any) {
            toast.error("Failed to add CWL clan", { description: e?.message });
        } finally {
            saving = false;
        }
    }

    async function updateClan(tag: string) {
        const name = form.cocClanName.trim();
        const league = form.cocClanLeague.trim();
        const leader = form.cocClanLeader.trim();

        if (!name || !league || !leader) {
            toast.error("All fields are required");
            return;
        }

        // Send only changed fields so the audit log records what actually changed.
        const original = clans.find((c) => c.cocClanTag === tag);
        const payload: UpdateAdminCwlClanMutationRequest = {};
        if (!original || original.cocClanName !== name) payload.cocClanName = name;
        if (!original || original.cocClanLeague !== league) payload.cocClanLeague = league;
        if (!original || original.cocClanLeader !== leader) payload.cocClanLeader = leader;

        if (Object.keys(payload).length === 0) {
            toast("No changes to save");
            return;
        }

        saving = true;
        try {
            const resp = (await updateAdminCwlClan(encodeURIComponent(tag), payload, {
                baseURL: PUBLIC_SERVER_URL,
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            })) as Awaited<ReturnType<typeof updateAdminCwlClan>> | UpdateAdminCwlClan401 | UpdateAdminCwlClan404 | UpdateAdminCwlClan500;
            if (resp.success) {
                clans = clans.map((c) => (c.cocClanTag === tag ? resp.data.clan : c));
                toast.success(`Updated ${resp.data.clan.cocClanName}`);
                editingTag = null;
                resetForm();
            } else {
                toast.error(errMsg(resp.error, "Failed to update CWL clan"));
            }
        } catch (e: any) {
            toast.error("Failed to update CWL clan", { description: e?.message });
        } finally {
            saving = false;
        }
    }

    async function removeClan(tag: string) {
        removing = tag;
        try {
            // The tag contains '#', so it must be URL-encoded into the path.
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

<div in:fadeIn class="flex size-full flex-col gap-6 overflow-y-auto p-2">
    <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold">CWL Clans</h1>
            <p class="text-sm text-stone-400">Add or remove the clans available for Clan War League assignments.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onclick={syncLeagues} disabled={loading || syncing || clans.length === 0}>
                <span class="flex items-center gap-2">
                    {#if syncing}
                        <SvgSpinnersRingResize class="size-4" /> Syncing...
                    {:else}
                        <TablerRefresh class="size-4" /> Sync leagues
                    {/if}
                </span>
            </Button>
            <Button onclick={openAdd} disabled={loading}>
                <span class="flex items-center gap-2"><TablerPlus class="size-4" /> Add CWL Clan</span>
            </Button>
        </div>
    </div>

    {#if loading}
        <div class="flex flex-1 items-center justify-center text-stone-400">
            <SvgSpinnersBlocksScale class="size-12" />
        </div>
    {:else if clans.length === 0}
        <div class="flex flex-1 flex-col items-center justify-center gap-3 text-stone-400">
            <TablerShield class="size-12" />
            <p class="text-sm">No CWL clans yet. Add one to get started.</p>
        </div>
    {:else}
        <div class="flex w-full gap-2">
            <Input placeholder="Search by clan name, tag, or leader..." bind:value={searchText} class="flex-1" />
        </div>

        {#if filteredClans.length === 0}
            <div class="flex flex-1 flex-col items-center justify-center gap-3 text-stone-400">
                <TablerShield class="size-12" />
                <p class="text-sm">No clans match your search.</p>
            </div>
        {:else}
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {#each filteredClans as clan (clan.cocClanTag)}
                    <div use:cardSlideIn class="flex h-full flex-col justify-between gap-3 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4">
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
                        <div class="flex items-center gap-2">
                            <Button variant="ghost" size="sm" class="flex-1" onclick={() => openEdit(clan)} disabled={removing === clan.cocClanTag}>
                                <span class="flex items-center gap-2">
                                    <TablerPencil class="size-4" /> Edit
                                </span>
                            </Button>
                            <ConfirmationDialog
                                title="Remove CWL Clan"
                                description={`Remove ${clan.cocClanName} (${clan.cocClanTag}) from CWL clans? This cannot be undone.`}
                                confirmText="Remove"
                                onConfirm={() => removeClan(clan.cocClanTag)}
                            >
                                <Button variant="danger" size="sm" class="flex-1" disabled={removing === clan.cocClanTag}>
                                    {#if removing === clan.cocClanTag}
                                        <span class="flex items-center gap-2">
                                            <SvgSpinnersRingResize class="size-4" /> Removing
                                        </span>
                                    {:else}
                                        <span class="flex items-center gap-2">
                                            <TablerTrash class="size-4" /> Remove
                                        </span>
                                    {/if}
                                </Button>
                            </ConfirmationDialog>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</div>

<Dialog
    bind:open={dialogOpen}
    title={editingTag === null ? "Add CWL Clan" : "Edit CWL Clan"}
    description={editingTag === null ? "Register a clan so it can be assigned CWL applications." : "Update this CWL clan's details."}
    confirmText={saving ? "Saving..." : editingTag === null ? "Add Clan" : "Save Changes"}
    onConfirm={submit}
>
    <div class="flex flex-col gap-4">
        <div class="flex flex-col items-start justify-center gap-1">
            <p class="text-sm font-medium">Clan tag</p>
            <Input placeholder="#ABC123" bind:value={form.cocClanTag} disabled={saving || editingTag !== null} />
            {#if editingTag !== null}
                <p class="text-xs text-stone-400">The clan tag can't be changed. Remove and re-add the clan to change it.</p>
            {/if}
        </div>
        <div class="flex flex-col items-start justify-center gap-1">
            <p class="text-sm font-medium">Clan name</p>
            <Input placeholder="Clan name" bind:value={form.cocClanName} disabled={saving} />
        </div>
        <div class="flex flex-col items-start justify-center gap-1">
            <p class="text-sm font-medium">League</p>
            <Input placeholder="e.g. Master League I" bind:value={form.cocClanLeague} disabled={saving} />
        </div>
        <div class="flex flex-col items-start justify-center gap-1">
            <p class="text-sm font-medium">Leader</p>
            <Input placeholder="Leader name" bind:value={form.cocClanLeader} disabled={saving} />
        </div>
    </div>
</Dialog>
