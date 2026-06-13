<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import ClanFormSidebar, { type ClanForm } from "$lib/components/ClanFormSidebar.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { Sidebar } from "$lib/components/ui/sidebar";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import {
        createAdminClan,
        deleteAdminClan,
        getAdminClans,
        updateAdminClan,
        verifyAdminClanDiscord,
        type CreateAdminClan401,
        type CreateAdminClan409,
        type CreateAdminClan422,
        type CreateAdminClan500,
        type CreateAdminClan503,
        type CreateAdminClanMutationRequest,
        type DeleteAdminClan401,
        type DeleteAdminClan404,
        type DeleteAdminClan500,
        type GetAdminClans200,
        type UpdateAdminClan401,
        type UpdateAdminClan404,
        type UpdateAdminClan422,
        type UpdateAdminClan500,
        type UpdateAdminClan503,
        type UpdateAdminClanMutationRequest,
        type VerifyAdminClanDiscord200,
        type VerifyAdminClanDiscord500,
        type VerifyAdminClanDiscord503,
    } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerCards from "~icons/tabler/cards";
    import TablerFlag from "~icons/tabler/flag";
    import TablerGift from "~icons/tabler/gift";
    import TablerPencil from "~icons/tabler/pencil";
    import TablerPlus from "~icons/tabler/plus";
    import TablerSwords from "~icons/tabler/swords";
    import TablerTrash from "~icons/tabler/trash";
    import TablerX from "~icons/tabler/x";

    type Clan = GetAdminClans200["data"]["clans"][number];

    let clans = $state<Clan[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let removing = $state<number | null>(null);
    let searchText = $state("");

    let clanSidebar: Sidebar | null = $state(null);
    // null = adding; otherwise the id being edited.
    let editingId = $state<number | null>(null);

    function emptyForm(): ClanForm {
        return {
            cocClanCode: "",
            cocClanName: "",
            cocClanLevel: "",
            cocClanTag: "",
            discordClanRoleId: "",
            discordClanChannelId: "",
            discordMemberRoleId: "",
            discordElderRoleId: "",
            discordColeaderRoleId: "",
            discordLeaderRoleId: "",
            discordLeaderId: "",
            attacksRequirement: 0,
            donationsRequirement: 0,
            clangamesRequirement: 0,
        };
    }

    let form = $state<ClanForm>(emptyForm());

    type DiscordResults = VerifyAdminClanDiscord200["data"]["results"];
    let discordResults = $state<DiscordResults | null>(null);
    let verifying = $state(false);
    let verified = $state(false);

    // Any form edit invalidates a prior verification, so changed data can't be saved on a stale flag.
    $effect(() => {
        JSON.stringify(form); // track every field
        verified = false;
        discordResults = null;
    });

    const DISCORD_KEYS = [
        "discordClanRoleId",
        "discordMemberRoleId",
        "discordElderRoleId",
        "discordColeaderRoleId",
        "discordLeaderRoleId",
        "discordClanChannelId",
        "discordLeaderId",
    ] as const satisfies readonly (keyof ClanForm)[];

    // Trimmed, non-empty Discord ID fields from an object.
    function pickDiscordFields(source: Record<string, unknown>): Record<string, string> {
        const out: Record<string, string> = {};
        for (const key of DISCORD_KEYS) {
            const val = source[key];
            if (typeof val === "string" && val.trim()) out[key] = val.trim();
        }
        return out;
    }

    // Verify Discord IDs against the guild; fills the per-field badges. True when all valid.
    async function verifyDiscord(fields: Record<string, string>): Promise<boolean> {
        if (Object.keys(fields).length === 0) return true;
        verifying = true;
        try {
            const resp = (await verifyAdminClanDiscord(fields, {
                baseURL: PUBLIC_SERVER_URL,
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            })) as Awaited<ReturnType<typeof verifyAdminClanDiscord>> | VerifyAdminClanDiscord500 | VerifyAdminClanDiscord503;
            if (resp.success) {
                discordResults = resp.data.results;
                return resp.data.ok;
            }
            toast.error(errMsg(resp.error, "Failed to verify Discord IDs"));
            return false;
        } catch (e: any) {
            toast.error("Failed to verify Discord IDs", { description: e?.message });
            return false;
        } finally {
            verifying = false;
        }
    }

    function errMsg(error: unknown, fallback: string) {
        return typeof error === "string" ? error : fallback;
    }

    let filteredClans = $derived(
        clans.filter(
            (clan) =>
                (clan.cocClanName ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
                clan.cocClanTag.toLowerCase().includes(searchText.toLowerCase()) ||
                clan.cocClanCode.toLowerCase().includes(searchText.toLowerCase()),
        ),
    );

    async function load() {
        loading = true;
        try {
            const resp = await getAdminClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                clans = resp.data.clans;
            } else {
                toast.error("Failed to load clans");
            }
        } catch (e: any) {
            toast.error("Failed to load clans", { description: e?.message });
        } finally {
            loading = false;
        }
    }

    function openAdd() {
        editingId = null;
        form = emptyForm();
        discordResults = null;
        clanSidebar?.open("add");
    }

    function openEdit(clan: Clan) {
        editingId = clan.id;
        form = {
            cocClanCode: clan.cocClanCode,
            cocClanName: clan.cocClanName ?? "",
            cocClanLevel: clan.cocClanLevel === null ? "" : String(clan.cocClanLevel),
            cocClanTag: clan.cocClanTag,
            discordClanRoleId: clan.discordClanRoleId,
            discordClanChannelId: clan.discordClanChannelId,
            discordMemberRoleId: clan.discordMemberRoleId,
            discordElderRoleId: clan.discordElderRoleId,
            discordColeaderRoleId: clan.discordColeaderRoleId,
            discordLeaderRoleId: clan.discordLeaderRoleId,
            discordLeaderId: clan.discordLeaderId,
            attacksRequirement: clan.attacksRequirement,
            donationsRequirement: clan.donationsRequirement,
            clangamesRequirement: clan.clangamesRequirement,
        };
        discordResults = null;
        clanSidebar?.open(String(clan.id));
    }

    function closeSidebar() {
        clanSidebar?.close();
        editingId = null;
        form = emptyForm();
        discordResults = null;
    }

    // Two-step: first click verifies, second saves.
    async function submit() {
        if (!verified) {
            const payload = buildPayload();
            if (!payload) return;
            const ok = await verifyDiscord(pickDiscordFields(payload));
            if (!ok) {
                toast.error("Some Discord IDs are invalid - fix them and verify again");
                return;
            }
            verified = true;
            toast.success("Verified data - click again to save");
            return;
        }

        if (editingId === null) createClanEntry();
        else updateClanEntry(editingId);
    }

    // Validate + normalise the form into a create payload (null if invalid).
    function buildPayload(): CreateAdminClanMutationRequest | null {
        let tag = form.cocClanTag.trim().toUpperCase();
        if (tag && !tag.startsWith("#")) tag = `#${tag}`;
        const code = form.cocClanCode.trim();

        if (!code || !tag || tag === "#") {
            toast.error("Clan code and tag are required");
            return null;
        }

        const requiredIds: [keyof ClanForm, string][] = [
            ["discordClanRoleId", "Clan role"],
            ["discordClanChannelId", "Clan channel"],
            ["discordMemberRoleId", "Member role"],
            ["discordElderRoleId", "Elder role"],
            ["discordColeaderRoleId", "Co-leader role"],
            ["discordLeaderRoleId", "Leader role"],
            ["discordLeaderId", "Leader user"],
        ];
        for (const [key, label] of requiredIds) {
            if (!String(form[key]).trim()) {
                toast.error(`${label} ID is required`);
                return null;
            }
        }

        const level = form.cocClanLevel.trim();
        return {
            cocClanCode: code,
            cocClanTag: tag,
            cocClanName: form.cocClanName.trim() || null,
            cocClanLevel: level === "" ? null : Number(level),
            discordClanRoleId: form.discordClanRoleId.trim(),
            discordClanChannelId: form.discordClanChannelId.trim(),
            discordMemberRoleId: form.discordMemberRoleId.trim(),
            discordElderRoleId: form.discordElderRoleId.trim(),
            discordColeaderRoleId: form.discordColeaderRoleId.trim(),
            discordLeaderRoleId: form.discordLeaderRoleId.trim(),
            discordLeaderId: form.discordLeaderId.trim(),
            attacksRequirement: Number(form.attacksRequirement) || 0,
            donationsRequirement: Number(form.donationsRequirement) || 0,
            clangamesRequirement: Number(form.clangamesRequirement) || 0,
        };
    }

    async function createClanEntry() {
        const payload = buildPayload();
        if (!payload) return;

        saving = true;
        try {
            const resp = (await createAdminClan(payload, {
                baseURL: PUBLIC_SERVER_URL,
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            })) as
                | Awaited<ReturnType<typeof createAdminClan>>
                | CreateAdminClan401
                | CreateAdminClan409
                | CreateAdminClan422
                | CreateAdminClan500
                | CreateAdminClan503;
            if (resp.success) {
                clans = [...clans, resp.data.clan].sort((a, b) => a.cocClanCode.localeCompare(b.cocClanCode));
                toast.success(`Added ${resp.data.clan.cocClanName ?? resp.data.clan.cocClanTag}`);
                closeSidebar();
            } else {
                toast.error(errMsg(resp.error, "Failed to add clan"));
            }
        } catch (e: any) {
            toast.error("Failed to add clan", { description: e?.message });
        } finally {
            saving = false;
        }
    }

    async function updateClanEntry(id: number) {
        const payload = buildPayload();
        if (!payload) return;

        // Send only changed fields so the audit log is accurate.
        const original = clans.find((c) => c.id === id);
        const diff: UpdateAdminClanMutationRequest = {};
        if (original) {
            for (const key of Object.keys(payload) as (keyof CreateAdminClanMutationRequest)[]) {
                if (original[key as keyof Clan] !== payload[key]) (diff as Record<string, unknown>)[key] = payload[key];
            }
        }

        if (original && Object.keys(diff).length === 0) {
            toast("No changes to save");
            return;
        }

        const outgoing = original ? diff : payload;
        saving = true;
        try {
            const resp = (await updateAdminClan(id, outgoing, {
                baseURL: PUBLIC_SERVER_URL,
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            })) as
                | Awaited<ReturnType<typeof updateAdminClan>>
                | UpdateAdminClan401
                | UpdateAdminClan404
                | UpdateAdminClan422
                | UpdateAdminClan500
                | UpdateAdminClan503;
            if (resp.success) {
                clans = clans.map((c) => (c.id === id ? resp.data.clan : c));
                toast.success(`Updated ${resp.data.clan.cocClanName ?? resp.data.clan.cocClanTag}`);
                closeSidebar();
            } else {
                toast.error(errMsg(resp.error, "Failed to update clan"));
            }
        } catch (e: any) {
            toast.error("Failed to update clan", { description: e?.message });
        } finally {
            saving = false;
        }
    }

    async function removeClan(clan: Clan) {
        removing = clan.id;
        try {
            const resp = (await deleteAdminClan(clan.id, { baseURL: PUBLIC_SERVER_URL, credentials: "include" })) as
                | Awaited<ReturnType<typeof deleteAdminClan>>
                | DeleteAdminClan401
                | DeleteAdminClan404
                | DeleteAdminClan500;
            if (resp.success) {
                clans = clans.filter((c) => c.id !== clan.id);
                toast.success("Clan removed");
            } else {
                toast.error(errMsg(resp.error, "Failed to remove clan"));
            }
        } catch (e: any) {
            toast.error("Failed to remove clan", { description: e?.message });
        } finally {
            removing = null;
        }
    }

    load();
</script>

<Seo title="Clans" description="Manage JPA clans" />

<div in:fadeIn class="flex size-full flex-col gap-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
            <h1 class="text-2xl font-bold">Clans</h1>
            <p class="text-sm text-stone-400">Manage JPA clans, their Discord links and member requirements.</p>
        </div>
        {#if !loading}
            <div class="flex items-center gap-2">
                {#if clans.length > 0}
                    <Input placeholder="Search by clan name, tag, or code..." bind:value={searchText} class="min-w-0 flex-1 sm:w-72 sm:flex-none" />
                {/if}
                <Button onclick={openAdd} class="shrink-0">
                    <span class="flex items-center gap-2">
                        <TablerPlus class="size-5 shrink-0 lg:size-4" />
                        <span class="hidden sm:inline">Add Clan</span>
                    </span>
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
            <TablerFlag class="size-12 lg:size-16" />
            <p class="text-sm">No clans yet. Add one to get started.</p>
        </div>
    {:else if filteredClans.length === 0}
        <div class="flex flex-1 flex-col items-center justify-center gap-3 pt-10 text-stone-400">
            <TablerX class="size-12 lg:size-16" />
            <p class="text-sm">No clans match your search.</p>
        </div>
    {:else}
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {#each filteredClans as clan (clan.id)}
                <div
                    use:cardSlideIn
                    class="@container flex flex-col gap-3 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-3 transition-colors duration-200 ease-in-out"
                >
                    <div class="flex min-w-0 items-center gap-3">
                        <div
                            class="flex size-11 shrink-0 items-center justify-center rounded-lg border-2 border-stone-700/50 bg-stone-950 px-1"
                            title="Clan code"
                        >
                            <span class="truncate text-sm font-bold text-stone-200">{clan.cocClanCode}</span>
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3 class="truncate font-semibold text-stone-50">{clan.cocClanName ?? "Unnamed clan"}</h3>
                            <p class="truncate font-mono text-xs text-stone-400">{clan.cocClanTag}</p>
                        </div>
                        <Badge variant="ghost" content={`Lvl ${clan.cocClanLevel ?? "–"}`} class="shrink-0" />
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5">
                        <Badge variant="blue" icon={TablerSwords} content={`${clan.attacksRequirement}`} />
                        <Badge variant="green" icon={TablerGift} content={`${clan.donationsRequirement}`} />
                        <Badge variant="purple" icon={TablerCards} content={`${clan.clangamesRequirement}`} />
                    </div>

                    <div class="flex flex-col gap-2 border-t border-stone-700/50 pt-3 @[14rem]:flex-row @[14rem]:items-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            class="w-full min-w-0 @[14rem]:w-auto @[14rem]:flex-1"
                            onclick={() => openEdit(clan)}
                            disabled={removing === clan.id}
                        >
                            <span class="flex items-center justify-center gap-2"><TablerPencil class="size-4 shrink-0" /> Edit</span>
                        </Button>
                        <ConfirmationDialog
                            class="w-full min-w-0 @[14rem]:w-auto @[14rem]:flex-1"
                            title="Remove Clan"
                            description={`Remove ${clan.cocClanName ?? clan.cocClanTag} (${clan.cocClanTag})? This cannot be undone.`}
                            confirmText="Remove"
                            onConfirm={() => removeClan(clan)}
                        >
                            <Button variant="danger" size="sm" class="w-full min-w-0" disabled={removing === clan.id}>
                                {#if removing === clan.id}
                                    <span class="flex items-center justify-center gap-2"
                                        ><SvgSpinnersRingResize class="size-4 shrink-0" /> Removing</span
                                    >
                                {:else}
                                    <span class="flex items-center justify-center gap-2"><TablerTrash class="size-4 shrink-0" /> Remove</span>
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
    <ClanFormSidebar {editingId} bind:form {saving} {verifying} {verified} {discordResults} onSubmit={submit} onCancel={closeSidebar} />
</Sidebar>
