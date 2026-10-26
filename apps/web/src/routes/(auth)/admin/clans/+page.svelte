<script lang="ts">
    import ClanFormSidebar, { type ClanForm } from "#lib/components/ClanFormSidebar.svelte";
    import Badge from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import ConfirmationDialog from "#lib/components/ui/ConfirmationDialog.svelte";
    import Icon from "#lib/components/ui/Icon.svelte";
    import Input from "#lib/components/ui/Input.svelte";
    import PageHeader from "#lib/components/ui/PageHeader.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import { Sidebar, sidebarStore } from "#lib/components/ui/sidebar/index.js";
    import Spinner from "#lib/components/ui/Spinner.svelte";
    import DataTable from "#lib/components/ui/table/DataTable.svelte";
    import type { TableColumn } from "#lib/components/ui/table/features.js";
    import { toast } from "#lib/toast.js";
    import { errorMessage } from "#lib/utils.js";
    import {
        createAdminClan,
        deleteAdminClan,
        getAdminClans,
        getCOCClan,
        updateAdminClan,
        verifyAdminClanDiscord,
        type CreateAdminClanBody,
        type GetAdminClansStatus200,
        type GetCOCClanStatus200,
        type UpdateAdminClanBody,
        type VerifyAdminClanDiscordStatus200,
    } from "@repo/clashofclans-client";
    import { renderSnippet } from "@tanstack/svelte-table";
    import TablerPencil from "~icons/tabler/pencil";
    import TablerPlus from "~icons/tabler/plus";
    import TablerShield from "~icons/tabler/shield";
    import TablerTrash from "~icons/tabler/trash";

    type Clan = GetAdminClansStatus200["data"]["clans"][number];
    type LiveClan = GetCOCClanStatus200["data"]["clan"];
    // A clan plus its live game data: undefined while loading, null when the CoC API had nothing.
    type Row = Clan & { live: LiveClan | null | undefined };

    const MAX_MEMBERS = 50;
    const nf = new Intl.NumberFormat("en-US");

    let clans = $state<Clan[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let removing = $state<number | null>(null);
    let searchText = $state("");
    let live = $state<Record<string, LiveClan | null>>({});
    const rows = $derived<Row[]>(clans.map((c) => ({ ...c, live: live[c.cocClanTag] })));

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

    type DiscordResults = VerifyAdminClanDiscordStatus200["data"]["results"];
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
            const resp = await verifyAdminClanDiscord({ body: fields });
            if (resp.data) {
                discordResults = resp.data.data.results;
                return resp.data.data.ok;
            }
            toast.error(errMsg(resp.error?.error, "Failed to verify Discord IDs"));
            return false;
        } catch (e) {
            toast.error("Failed to verify Discord IDs", { description: errorMessage(e) });
            return false;
        } finally {
            verifying = false;
        }
    }

    function errMsg(error: unknown, fallback: string) {
        return typeof error === "string" ? error : fallback;
    }

    async function loadLive(tags: string[]) {
        await Promise.all(
            tags.map(async (tag) => {
                try {
                    const resp = await getCOCClan({ path: { tag } });
                    live[tag] = resp.data?.data.clan ?? null;
                } catch {
                    live[tag] = null;
                }
            }),
        );
    }

    const requirementColumn = (
        key: "attacksRequirement" | "donationsRequirement" | "clangamesRequirement",
        header: string,
        icon: string,
        size: number,
    ) =>
        ({
            accessorKey: key,
            header,
            size,
            cell: ({ row }) => renderSnippet(requirementCell, { icon, value: row.original[key] }),
            meta: { filter: "number" },
        }) satisfies TableColumn<Row>;

    const columns: TableColumn<Row>[] = [
        {
            id: "clan",
            accessorFn: (r) => r.cocClanName ?? "",
            header: "Clan",
            size: 210,
            cell: ({ row }) => renderSnippet(clanCell, row.original),
        },
        {
            accessorKey: "cocClanCode",
            header: "Code",
            size: 75,
            cell: ({ row }) => renderSnippet(codeCell, row.original.cocClanCode),
        },
        {
            accessorKey: "cocClanLevel",
            header: "Level",
            size: 90,
            cell: ({ row }) => renderSnippet(levelCell, row.original.cocClanLevel),
            meta: { filter: "number" },
        },
        {
            id: "members",
            accessorFn: (r) => r.live?.members ?? null,
            header: "Members",
            size: 155,
            cell: ({ row }) => renderSnippet(membersCell, row.original.live),
            meta: { filter: "number" },
        },
        {
            id: "warLeague",
            // Sorts by the league's id, which follows its rank in game.
            accessorFn: (r) => r.live?.warLeague?.id ?? null,
            header: "War league",
            size: 150,
            cell: ({ row }) => renderSnippet(leagueCell, row.original.live),
        },
        requirementColumn("attacksRequirement", "Attacks", "labels/attacks", 115),
        requirementColumn("donationsRequirement", "Donations", "labels/donations", 125),
        requirementColumn("clangamesRequirement", "Clan games", "labels/clan-games", 140),
        {
            id: "actions",
            header: "",
            size: 110,
            enableSorting: false,
            enableResizing: false,
            cell: ({ row }) => renderSnippet(actionsCell, row.original),
        },
    ];

    async function load() {
        loading = true;
        try {
            const resp = await getAdminClans({});
            if (resp.data) {
                clans = resp.data.data.clans;
                loadLive(clans.map((c) => c.cocClanTag));
            } else {
                toast.error("Failed to load clans");
            }
        } catch (e) {
            toast.error("Failed to load clans", { description: errorMessage(e) });
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
    function buildPayload(): CreateAdminClanBody | null {
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
            const resp = await createAdminClan({ body: payload });
            if (resp.data) {
                clans = [...clans, resp.data.data.clan].sort((a, b) => a.cocClanCode.localeCompare(b.cocClanCode));
                loadLive([resp.data.data.clan.cocClanTag]);
                toast.success(`Added ${resp.data.data.clan.cocClanName ?? resp.data.data.clan.cocClanTag}`);
                closeSidebar();
            } else {
                toast.error(errMsg(resp.error?.error, "Failed to add clan"));
            }
        } catch (e) {
            toast.error("Failed to add clan", { description: errorMessage(e) });
        } finally {
            saving = false;
        }
    }

    async function updateClanEntry(id: number) {
        const payload = buildPayload();
        if (!payload) return;

        // Send only changed fields so the audit log is accurate.
        const original = clans.find((c) => c.id === id);
        const diff: UpdateAdminClanBody = {};
        if (original) {
            for (const key of Object.keys(payload) as (keyof CreateAdminClanBody)[]) {
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
            const resp = await updateAdminClan({ path: { id }, body: outgoing });
            if (resp.data) {
                clans = clans.map((c) => (c.id === id ? resp.data.data.clan : c));
                if (!(resp.data.data.clan.cocClanTag in live)) loadLive([resp.data.data.clan.cocClanTag]);
                toast.success(`Updated ${resp.data.data.clan.cocClanName ?? resp.data.data.clan.cocClanTag}`);
                closeSidebar();
            } else {
                toast.error(errMsg(resp.error?.error, "Failed to update clan"));
            }
        } catch (e) {
            toast.error("Failed to update clan", { description: errorMessage(e) });
        } finally {
            saving = false;
        }
    }

    async function removeClan(clan: Clan) {
        removing = clan.id;
        try {
            const resp = await deleteAdminClan({ path: { id: clan.id } });
            if (resp.data) {
                clans = clans.filter((c) => c.id !== clan.id);
                toast.success("Clan removed");
            } else {
                toast.error(errMsg(resp.error?.error, "Failed to remove clan"));
            }
        } catch (e) {
            toast.error("Failed to remove clan", { description: errorMessage(e) });
        } finally {
            removing = null;
        }
    }

    load();
</script>

<Seo title="Clans" description="Manage JPA clans" />

{#snippet clanCell(row: Row)}
    <div class="flex min-w-0 items-center gap-3">
        <div class="grid size-9 shrink-0 place-items-center">
            {#if row.live?.badgeUrls}
                <img src={row.live.badgeUrls.small} alt="" class="size-9 object-contain" loading="lazy" />
            {:else if row.live === undefined}
                <div class="size-7 skeleton rounded-md"></div>
            {:else}
                <TablerShield class="size-7 text-stone-600" />
            {/if}
        </div>
        <div class="flex min-w-0 flex-col">
            <span class="truncate text-sm font-medium text-stone-200">{row.cocClanName ?? "Unnamed clan"}</span>
            <span class="truncate font-mono text-xs text-stone-400">{row.cocClanTag}</span>
        </div>
    </div>
{/snippet}

{#snippet codeCell(code: string)}
    <span class="rounded-md border border-stone-700/50 bg-stone-900 px-1.5 py-0.5 font-mono text-xs font-semibold text-stone-300">{code}</span>
{/snippet}

{#snippet levelCell(level: number | null)}
    {#if level === null}
        <span class="text-sm text-stone-500">—</span>
    {:else}
        <Badge variant="yellow" content={`Lv ${level}`} class="font-bold" />
    {/if}
{/snippet}

{#snippet membersCell(info: LiveClan | null | undefined)}
    {#if info}
        {@const full = info.members >= MAX_MEMBERS}
        <div class="flex w-full min-w-0 flex-col gap-1.5">
            <div class="flex items-baseline justify-between gap-2 text-xs">
                <span class="text-stone-200 tabular-nums">
                    <span class="font-semibold">{info.members}</span><span class="text-stone-500"> / {MAX_MEMBERS}</span>
                </span>
                <span class={full ? "text-stone-500" : "text-green-400"}>{full ? "Full" : `${MAX_MEMBERS - info.members} open`}</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                <div
                    class="h-full rounded-full {full ? 'bg-stone-500' : 'bg-green-500'}"
                    style="width: {(Math.min(info.members, MAX_MEMBERS) / MAX_MEMBERS) * 100}%"
                ></div>
            </div>
        </div>
    {:else if info === undefined}
        <div class="flex w-full flex-col gap-1.5">
            <div class="h-3 w-16 skeleton rounded"></div>
            <div class="h-1.5 w-full skeleton rounded-full"></div>
        </div>
    {:else}
        <span class="text-sm text-stone-500">—</span>
    {/if}
{/snippet}

{#snippet leagueCell(info: LiveClan | null | undefined)}
    {#if info?.warLeague}
        <div class="flex min-w-0 items-center gap-2">
            <Icon name="labels/clan-war-league" class="size-5 shrink-0" />
            <span class="truncate text-sm text-stone-200">{info.warLeague.name.replace(/ League/, "")}</span>
        </div>
    {:else if info === undefined}
        <div class="h-3 w-20 skeleton rounded"></div>
    {:else}
        <span class="text-sm text-stone-500">—</span>
    {/if}
{/snippet}

{#snippet requirementCell({ icon, value }: { icon: string; value: number })}
    <div class="flex items-center gap-2">
        <Icon name={icon} class="size-5 shrink-0" />
        <span class="text-sm font-medium text-stone-200 tabular-nums">{nf.format(value)}</span>
    </div>
{/snippet}

{#snippet actionsCell(row: Row)}
    <div class="flex items-center justify-center gap-2">
        <Button size="icon" variant="base" tooltip="Edit clan" tooltipPlacement="bottom" onclick={() => openEdit(row)} disabled={removing === row.id}>
            <TablerPencil />
        </Button>
        <ConfirmationDialog
            title="Remove Clan"
            description={`Remove ${row.cocClanName ?? row.cocClanTag} (${row.cocClanTag})? This cannot be undone.`}
            confirmText="Remove"
            onConfirm={() => removeClan(row)}
        >
            <Button size="icon" variant="danger" tooltip="Remove clan" tooltipPlacement="bottom" disabled={removing === row.id}>
                {#if removing === row.id}
                    <Spinner />
                {:else}
                    <TablerTrash />
                {/if}
            </Button>
        </ConfirmationDialog>
    </div>
{/snippet}

<div class="relative flex size-full flex-col gap-4 overflow-hidden">
    <div class="px-4 pt-4">
        <PageHeader title="Clans" subtitleLoading={loading} subtitle="{clans.length} clan{clans.length === 1 ? '' : 's'}">
            {#snippet actions()}
                <Input placeholder="Search by clan name, tag, or code..." bind:value={searchText} class="min-w-36 flex-1 @4xl:max-w-80" />
                <Button onclick={openAdd} class="shrink-0" disabled={loading} tooltip="Add a new clan" tooltipPlacement="bottom">
                    <TablerPlus class="size-5 shrink-0" />
                </Button>
            {/snippet}
        </PageHeader>
    </div>

    <div class="min-h-0 flex-1">
        <DataTable
            data={rows}
            {columns}
            getRowId={(r) => String(r.id)}
            {loading}
            search={searchText}
            searchText={(r) => `${r.cocClanName ?? ""} ${r.cocClanTag} ${r.cocClanCode}`}
            emptyText={clans.length ? "No clans match your search" : "No clans yet. Add one to get started."}
            rowClass={(r) => sidebarStore.isOpen && editingId === r.id && "*:bg-stone-800/60"}
        />
    </div>
</div>

<Sidebar bind:this={clanSidebar}>
    <ClanFormSidebar {editingId} bind:form {saving} {verifying} {verified} {discordResults} onSubmit={submit} onCancel={closeSidebar} />
</Sidebar>
