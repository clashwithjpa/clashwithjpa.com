<script lang="ts">
    /* eslint-disable @typescript-eslint/no-explicit-any */
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CocAccountSidebar from "$lib/components/CocAccountSidebar.svelte";
    import BonusSeasonsCell from "$lib/components/grid/BonusSeasonsCell.svelte";
    import ClanCell from "$lib/components/grid/ClanCell.svelte";
    import CwlAccountCell from "$lib/components/grid/CwlAccountCell.svelte";
    import CwlDiscordCell from "$lib/components/grid/CwlDiscordCell.svelte";
    import CwlNicknameCell from "$lib/components/grid/CwlNicknameCell.svelte";
    import CwlStarsCell from "$lib/components/grid/CwlStarsCell.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import PageHeader from "$lib/components/ui/PageHeader.svelte";
    import Select, { type Option } from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { Sidebar } from "$lib/components/ui/sidebar";
    import DataTable from "$lib/components/ui/table/DataTable.svelte";
    import type { TableColumn } from "$lib/components/ui/table/features";
    import { loadGuildNicknames } from "$lib/discordNicknames";
    import {
        assignCwlApplication,
        getBonusData,
        getBonusLedger,
        getCwlSeasons,
        getCwlStats,
        getJPAClans,
        getJPACwlClans,
        setUserSeasonBonus,
        updateCocAccountStats,
        updateCocAccountWarWeight,
        updateCwlApplicationNotes,
        type GetBonusData200,
        type GetCwlSeasons200,
        type GetCwlStats200,
    } from "@repo/clashofclans-client";
    import { renderComponent, type SortingState } from "@tanstack/svelte-table";
    import { toast } from "svelte-sonner";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerDownload from "~icons/tabler/download";
    import TablerSwords from "~icons/tabler/swords";

    type BonusRow = GetBonusData200["data"]["rows"][number] & { discordNickname?: string };
    type Season = GetCwlSeasons200["data"]["seasons"][number];
    type CwlStat = GetCwlStats200["data"]["stats"][number];
    // A bonus is per Discord user per season; each row carries the set of season
    // ids its owner has been awarded (shared across that user's accounts). CWL
    // attacks/stars are live-fetched on demand.
    type Row = BonusRow & { bonusSeasonIds: number[]; cwlAttacks?: number; cwlStars?: number; cwlDetails?: CwlStat["details"] };

    let rows = $state<Row[]>([]);
    let seasons = $state<Season[]>([]);
    let currentSeasonId = $state<number | null>(null);
    let currentSeasonName = $derived(seasons.find((s) => s.id === currentSeasonId)?.name ?? null);
    // Split the season columns: the active season (awarded now) vs. all the rest.
    let currentSeasonList = $derived(seasons.filter((s) => s.id === currentSeasonId));
    let pastSeasons = $derived(seasons.filter((s) => s.id !== currentSeasonId));
    let selectedSeasonValue = $state("");
    let seasonOptions = $derived<Option[]>(seasons.map((s) => ({ label: s.name, value: String(s.id) })));
    let total = $state(0);
    let loading = $state(true);
    let nicknamesLoading = $state(false);
    let nicknameLoadId = 0;
    let downloading = $state(false);
    let fetchingCwl = $state(false);
    let searchText = $state("");
    let dataTable = $state<ReturnType<typeof DataTable<Row>> | null>(null);
    let displayedCount = $derived(dataTable?.getDisplayedCount() ?? 0);
    let activeFilters = $derived(dataTable?.getActiveFilterCount() ?? 0);
    let sorting = $state<SortingState>([{ id: "totalDonated", desc: true }]);

    // Tag -> name lookups for the clan cells. The "Clan" column holds the JPA clan
    // the account applied with; the "Assigned clan" column holds a CWL clan.
    let clanNameByTag = $state<Record<string, string>>({});
    let cwlClanOptions = $state<Option[]>([{ label: "Unassigned", value: "" }]);
    let cwlClanNameByTag = $state<Record<string, string>>({});

    // CoC account detail sidebar (opened from the COC account cell's eye button).
    let accountSidebar: Sidebar | null = $state(null);
    let selectedAccount = $state<Record<string, unknown> | null>(null);
    function openAccountSidebar(account: Row) {
        selectedAccount = account;
        accountSidebar?.open(String(account.cocAccountId));
    }

    const normalizeTag = (tag: string | null | undefined) => (tag ?? "").trim().toUpperCase();

    // Stat columns edited inline; mirror the COC accounts admin page (a later
    // Google Sheet sync will overwrite these manual edits).
    type StatField = "totalDonated" | "totalReceived" | "clanGames" | "capitalGoldLooted" | "capitalGoldContributed" | "activityScore";

    function clanLabel(clanTag: string | null | undefined): string {
        if (!clanTag) return "Unassigned";
        return cwlClanOptions.find((o) => o.value === clanTag)?.label ?? clanTag;
    }

    // Rows are clustered by assigned CWL clan (groups A→Z, unassigned last); the
    // active sort orders rows within each clan.
    const groupByClan = (r: Row) => r.assignedTo ?? "";
    const compareClans = (a: string, b: string) => (a === "" ? 1 : b === "" ? -1 : clanLabel(a).localeCompare(clanLabel(b)));

    function searchTextFor(r: Row): string {
        return [
            r.discordUsername,
            r.discordUserId,
            r.discordNickname,
            r.cocAccountName,
            r.cocAccountTag,
            clanNameByTag[normalizeTag(r.cocAccountClan)],
            r.cocAccountClan,
            r.preferenceNum,
            r.warWeight,
            clanLabel(r.assignedTo),
            r.totalDonated,
            r.totalReceived,
            r.clanGames,
            r.capitalGoldLooted,
            r.capitalGoldContributed,
            r.activityScore,
            r.cwlAttacks,
            r.cwlStars,
            r.notes,
        ]
            .filter((v) => v != null)
            .join(" ");
    }

    function patchRows(match: (r: Row) => boolean, patch: (r: Row) => Partial<Row>) {
        rows = rows.map((r) => (match(r) ? { ...r, ...patch(r) } : r));
    }

    async function loadClans() {
        try {
            const resp = await getJPAClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                clanNameByTag = Object.fromEntries(Object.values(resp.data.clans).map((c) => [normalizeTag(c.clanTag), c.clanName ?? c.clanTag]));
            }
        } catch {
            // Clan cells fall back to showing the raw tag.
        }
    }

    async function loadCwlClans() {
        try {
            const resp = await getJPACwlClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                const clans = Object.values(resp.data.clans);
                cwlClanOptions = [
                    { label: "Unassigned", value: "" },
                    ...clans.map((c) => ({ label: `${c.clanName} (${c.clanTag})`, value: c.clanTag })),
                ];
                cwlClanNameByTag = Object.fromEntries(clans.map((c) => [normalizeTag(c.clanTag), c.clanName]));
            }
        } catch {
            // Assigned-clan editor still works without resolved names.
        }
    }

    async function load(seasonId?: number) {
        loading = true;
        try {
            const [bd, bl, ss] = await Promise.all([
                getBonusData({ seasonId }, { baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
                getBonusLedger({ baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
                getCwlSeasons({ baseURL: PUBLIC_SERVER_URL, credentials: "include" }),
            ]);
            if (!bd.success) {
                toast.error("Failed to load bonus data");
                return;
            }
            seasons = ss.success ? ss.data.seasons : [];
            // Bonus is per Discord user: collect the season ids each user has earned,
            // so all of that user's accounts render the same ticks.
            const seasonsByUser = new Map<string, number[]>();
            if (bl.success) {
                for (const b of bl.data.bonuses) {
                    const list = seasonsByUser.get(b.discordUserId) ?? [];
                    list.push(b.seasonId);
                    seasonsByUser.set(b.discordUserId, list);
                }
            }
            rows = bd.data.rows.map((r) => ({
                ...r,
                bonusSeasonIds: seasonsByUser.get(r.discordUserId) ?? [],
            }));
            total = bd.data.total;
            currentSeasonId = bd.data.seasonId;
            selectedSeasonValue = currentSeasonId != null ? String(currentSeasonId) : "";
        } catch (error) {
            toast.error("Failed to load bonus data", { description: error instanceof Error ? error.message : undefined });
        } finally {
            loading = false;
        }
        // Nicknames load separately so the table isn't blocked on the Discord
        // guild-member walk; the Nickname column shows a skeleton until they arrive.
        void loadNicknames();
    }

    async function loadNicknames() {
        const id = ++nicknameLoadId;
        nicknamesLoading = true;
        try {
            const nicknames = await loadGuildNicknames();
            if (id !== nicknameLoadId) return; // superseded by a newer load()
            rows = rows.map((r) => ({ ...r, discordNickname: nicknames[r.discordUserId] }));
        } finally {
            if (id === nicknameLoadId) nicknamesLoading = false;
        }
    }

    // Live-fetches CWL attacks/stars for the roster's season (assigned clans only)
    // and merges them onto the rows; nothing is persisted.
    async function fetchCwlStats() {
        fetchingCwl = true;
        try {
            const resp = await getCwlStats({ seasonId: currentSeasonId ?? undefined }, { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (!resp.success) throw new Error();
            const byTag = new Map(resp.data.stats.map((s) => [s.tag.toUpperCase(), s]));
            rows = rows.map((r) => {
                const s = byTag.get(normalizeTag(r.cocAccountTag));
                return { ...r, cwlAttacks: s?.attacks ?? 0, cwlStars: s?.stars ?? 0, cwlDetails: s?.details ?? [] };
            });
            toast.success("CWL stats fetched");
        } catch (error) {
            toast.error("Failed to fetch CWL stats", { description: error instanceof Error ? error.message : undefined });
        } finally {
            fetchingCwl = false;
        }
    }

    async function assign(row: Row, clanTag: string) {
        const previous = row.assignedTo;
        patchRows(
            (r) => r.id === row.id,
            () => ({ assignedTo: clanTag || null }),
        );
        try {
            const resp = await assignCwlApplication(
                row.id,
                { clanTag: clanTag || null },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error();
            patchRows(
                (r) => r.id === row.id,
                () => ({ assignedTo: resp.data.application.assignedTo ?? null }),
            );
            toast.success(clanTag ? `Bonus clan set to ${clanLabel(clanTag)}` : "Bonus clan cleared");
        } catch (error) {
            patchRows(
                (r) => r.id === row.id,
                () => ({ assignedTo: previous }),
            );
            toast.error("Failed to update bonus clan", { description: error instanceof Error ? error.message : undefined });
        }
    }

    async function saveNotes(row: Row, value: string) {
        const notes = value.trim() ? value : null;
        const previous = row.notes;
        patchRows(
            (r) => r.id === row.id,
            () => ({ notes }),
        );
        try {
            const resp = await updateCwlApplicationNotes(
                row.id,
                { notes },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error();
            patchRows(
                (r) => r.id === row.id,
                () => ({ notes: resp.data.application.notes }),
            );
            toast.success("Notes updated");
        } catch (error) {
            patchRows(
                (r) => r.id === row.id,
                () => ({ notes: previous }),
            );
            toast.error("Failed to update notes", { description: error instanceof Error ? error.message : undefined });
        }
    }

    // War weight and stats live on the CoC account, so every row for that account changes.
    async function saveWarWeight(row: Row, warWeight: number) {
        if (!Number.isInteger(warWeight) || warWeight < 0) {
            toast.error("War weight must be a non-negative whole number");
            return;
        }
        const previous = row.warWeight;
        const sameAccount = (r: Row) => r.cocAccountId === row.cocAccountId;
        patchRows(sameAccount, () => ({ warWeight }));
        try {
            const resp = await updateCocAccountWarWeight(
                row.cocAccountId,
                { warWeight },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error();
            patchRows(sameAccount, () => ({ warWeight: resp.data.account.warWeight }));
            toast.success(`War weight updated for ${row.cocAccountName}`);
        } catch (error) {
            patchRows(sameAccount, () => ({ warWeight: previous }));
            toast.error("Failed to update war weight", { description: error instanceof Error ? error.message : undefined });
        }
    }

    async function saveStat(row: Row, field: StatField, label: string, n: number) {
        if (!Number.isInteger(n) || n < 0) {
            toast.error(`${label} must be a non-negative whole number`);
            return;
        }
        const previous = row[field];
        const sameAccount = (r: Row) => r.cocAccountId === row.cocAccountId;
        patchRows(sameAccount, () => ({ [field]: n }));
        try {
            const resp = await updateCocAccountStats(
                row.cocAccountId,
                { [field]: n },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error();
            patchRows(sameAccount, () => ({ [field]: (resp.data.account as Record<string, unknown>)[field] as number }));
            toast.success(`${label} updated for ${row.cocAccountName}`);
        } catch (error) {
            patchRows(sameAccount, () => ({ [field]: previous }));
            toast.error(`Failed to update ${label.toLowerCase()}`, { description: error instanceof Error ? error.message : undefined });
        }
    }

    // Wraps a CSV cell so commas, quotes and newlines survive a round-trip.
    function csvCell(value: unknown): string {
        const s = value == null ? "" : String(value);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }

    const CSV_COLUMNS: { header: string; field: keyof BonusRow }[] = [
        { header: "Discord", field: "discordUsername" },
        { header: "Nickname", field: "discordNickname" },
        { header: "Discord ID", field: "discordUserId" },
        { header: "Account", field: "cocAccountName" },
        { header: "Tag", field: "cocAccountTag" },
        { header: "Clan", field: "cocAccountClan" },
        { header: "Preference", field: "preferenceNum" },
        { header: "War Weight", field: "warWeight" },
        { header: "Assigned Clan", field: "assignedTo" },
        { header: "Town Hall", field: "townHall" },
        { header: "Total Donated", field: "totalDonated" },
        { header: "Total Received", field: "totalReceived" },
        { header: "Clan Games", field: "clanGames" },
        { header: "Capital Gold Looted", field: "capitalGoldLooted" },
        { header: "Capital Gold Contributed", field: "capitalGoldContributed" },
        { header: "Activity Score", field: "activityScore" },
        { header: "Notes", field: "notes" },
    ];

    function downloadCsv() {
        downloading = true;
        try {
            const lines = [
                [...CSV_COLUMNS.map((c) => csvCell(c.header)), ...seasons.map((s) => csvCell(s.name))].join(","),
                ...rows.map((r) =>
                    [
                        ...CSV_COLUMNS.map((c) => {
                            if (c.field === "cocAccountClan") return csvCell(clanNameByTag[normalizeTag(r.cocAccountClan)] ?? r.cocAccountClan ?? "");
                            if (c.field === "assignedTo")
                                return csvCell(r.assignedTo ? (cwlClanNameByTag[normalizeTag(r.assignedTo)] ?? r.assignedTo) : "");
                            return csvCell(r[c.field]);
                        }),
                        ...seasons.map((s) => (r.bonusSeasonIds.includes(s.id) ? "TRUE" : "FALSE")),
                    ].join(","),
                ),
            ];
            const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `cwl-bonus-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"}`);
        } catch (error) {
            toast.error("Failed to export CSV", { description: error instanceof Error ? error.message : undefined });
        } finally {
            downloading = false;
        }
    }

    const formatNumber = (value: unknown) => (value != null ? Number(value).toLocaleString() : "");

    // Awards or removes a season's bonus for a user. Bonus is per Discord user, so
    // the change is mirrored onto every row that user owns.
    async function toggleBonus(data: Row, seasonId: number, selected: boolean) {
        const discordUserId = data.discordUserId;
        const apply = (sel: boolean) =>
            patchRows(
                (r) => r.discordUserId === discordUserId,
                (r) => ({ bonusSeasonIds: sel ? [...new Set([...r.bonusSeasonIds, seasonId])] : r.bonusSeasonIds.filter((x) => x !== seasonId) }),
            );
        apply(selected);
        try {
            const resp = await setUserSeasonBonus(
                { discordUserId, seasonId, cocAccountTag: data.cocAccountTag, selected },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error();
            toast.success(`Bonus ${selected ? "awarded to" : "removed from"} ${data.discordUsername}`);
        } catch (error) {
            apply(!selected);
            toast.error("Failed to update bonus", { description: error instanceof Error ? error.message : undefined });
        }
    }

    // Season badge columns are sized to fit every badge, so none get clipped.
    const seasonsWidth = (list: Season[]) => Math.max(120, 24 + list.reduce((w, s) => w + 46 + s.name.length * 7.5, 0));

    function statColumn(field: StatField, header: string, size: number): TableColumn<Row> {
        return {
            accessorKey: field,
            header,
            size,
            cell: ({ getValue }) => formatNumber(getValue()),
            meta: { filter: "number", edit: { type: "number", commit: (row: Row, n: number) => saveStat(row, field, header, n) } },
        };
    }

    let columns = $derived<TableColumn<Row>[]>([
        {
            accessorKey: "discordUsername",
            header: "Discord",
            size: 220,
            cell: ({ row }) => renderComponent(CwlDiscordCell, { app: row.original }),
        },
        {
            accessorKey: "discordNickname",
            header: "Nickname",
            size: 150,
            sortUndefined: "last",
            cell: ({ getValue }) => renderComponent(CwlNicknameCell, { value: getValue(), loading: nicknamesLoading }),
        },
        {
            accessorKey: "cocAccountName",
            header: "COC Account",
            size: 260,
            cell: ({ row }) => renderComponent(CwlAccountCell, { account: row.original, onOpen: () => openAccountSidebar(row.original) }),
        },
        {
            accessorKey: "cocAccountClan",
            header: "Clan",
            size: 170,
            cell: ({ getValue }) => renderComponent(ClanCell, { tag: getValue(), name: clanNameByTag[normalizeTag(getValue())] ?? null }),
            meta: {
                filter: "set",
                filterLabel: (tag) => {
                    if (!tag) return "No clan";
                    const name = clanNameByTag[normalizeTag(tag)];
                    // Some accounts store the clan name instead of its tag.
                    return name ? `${name} (${tag})` : tag;
                },
            },
        },
        { accessorKey: "preferenceNum", header: "Pref.", size: 90, meta: { filter: "number" } },
        {
            accessorKey: "warWeight",
            header: "War Weight",
            size: 130,
            cell: ({ getValue }) => formatNumber(getValue()),
            meta: { filter: "number", edit: { type: "number", commit: saveWarWeight } },
        },
        {
            id: "assignedTo",
            accessorFn: (r) => r.assignedTo ?? "",
            header: "Assigned Clan",
            size: 190,
            cell: ({ getValue }) =>
                renderComponent(ClanCell, { tag: getValue(), name: getValue() ? (cwlClanNameByTag[normalizeTag(getValue())] ?? null) : null }),
            meta: { filter: "set", filterLabel: clanLabel, edit: { type: "select", options: () => cwlClanOptions, commit: assign } },
        },
        statColumn("totalDonated", "Total Donated", 140),
        statColumn("totalReceived", "Total Received", 140),
        statColumn("clanGames", "Clan Games", 130),
        statColumn("capitalGoldLooted", "Capital Looted", 140),
        statColumn("capitalGoldContributed", "Capital Contributed", 170),
        statColumn("activityScore", "Activity Score", 140),
        {
            accessorKey: "cwlAttacks",
            header: "CWL Attacks",
            size: 130,
            sortUndefined: "last",
            cell: ({ getValue }) => (getValue() == null ? "" : `${getValue()}/7`),
            meta: { filter: "number" },
        },
        {
            accessorKey: "cwlStars",
            header: "CWL Stars",
            size: 120,
            sortUndefined: "last",
            cell: ({ row }) =>
                renderComponent(CwlStarsCell, {
                    stars: row.original.cwlStars ?? null,
                    attacks: row.original.cwlAttacks,
                    details: row.original.cwlDetails,
                }),
        },
        {
            id: "thisSeasonBonus",
            header: "This Season",
            size: seasonsWidth(currentSeasonList),
            enableSorting: false,
            cell: ({ row }) =>
                renderComponent(BonusSeasonsCell, {
                    seasons: currentSeasonList,
                    awarded: row.original.bonusSeasonIds,
                    onToggle: (seasonId: number, selected: boolean) => toggleBonus(row.original, seasonId, selected),
                }),
        },
        {
            id: "pastBonuses",
            header: "Past Bonuses",
            size: seasonsWidth(pastSeasons),
            enableSorting: false,
            cell: ({ row }) =>
                renderComponent(BonusSeasonsCell, {
                    seasons: pastSeasons,
                    awarded: row.original.bonusSeasonIds,
                    onToggle: (seasonId: number, selected: boolean) => toggleBonus(row.original, seasonId, selected),
                }),
        },
        {
            accessorKey: "notes",
            header: "Notes",
            size: 220,
            enableSorting: false,
            cell: ({ getValue }) => getValue() ?? "",
            meta: { edit: { type: "text", commit: saveNotes } },
        },
    ]);

    load();
    loadClans();
    loadCwlClans();
</script>

<Seo title="CWL Bonus" description="Assign CWL bonuses and review linked account stats." />

<div class="relative flex size-full flex-col gap-4 overflow-hidden">
    <PageHeader title="CWL Bonus" class="px-4 pt-4">
        {#snippet subtitle()}
            {#if loading}
                Loading…
            {:else}
                {#if currentSeasonName}<span class="font-medium text-stone-300">{currentSeasonName}</span> ·
                {/if}
                {#if searchText.trim() || activeFilters}{displayedCount} of {total}{:else}{total}{/if} entr{total === 1 ? "y" : "ies"}
                {#if activeFilters}
                    ·
                    <button
                        type="button"
                        class="cursor-pointer text-stone-300 underline-offset-2 hover:text-stone-50 hover:underline"
                        onclick={() => dataTable?.clearFilters()}
                    >
                        Clear {activeFilters} filter{activeFilters === 1 ? "" : "s"}
                    </button>
                {/if}
            {/if}
        {/snippet}
        {#snippet actions()}
            {#if seasonOptions.length > 0}
                <Select
                    options={seasonOptions}
                    bind:value={selectedSeasonValue}
                    onValueChange={(v) => load(Number(v))}
                    placeholder="Season"
                    disabled={loading}
                    class="w-full @md:w-44 @md:shrink-0"
                />
            {/if}
            <Input placeholder="Search anything..." bind:value={searchText} class="min-w-36 flex-1 @4xl:max-w-80" />
            <Button
                variant="base"
                class="shrink-0"
                disabled={fetchingCwl || loading || rows.length === 0}
                onclick={fetchCwlStats}
                tooltip="Fetch live CWL attacks & stars"
                tooltipPlacement="bottom"
            >
                {#if fetchingCwl}
                    <SvgSpinnersRingResize class="size-5" />
                {:else}
                    <TablerSwords class="size-5" />
                {/if}
            </Button>
            <Button
                variant="base"
                class="shrink-0"
                disabled={downloading || rows.length === 0}
                onclick={downloadCsv}
                tooltip="Download as CSV"
                tooltipPlacement="bottom"
            >
                {#if downloading}
                    <SvgSpinnersRingResize class="size-5" />
                {:else}
                    <TablerDownload class="size-5" />
                {/if}
            </Button>
        {/snippet}
    </PageHeader>

    {#if !loading && seasons.length === 0}
        <div class="px-4 text-xs text-stone-400">
            No CWL seasons yet — create one in <span class="font-medium text-stone-300">Settings</span> to start awarding bonuses.
        </div>
    {/if}

    <div class="min-h-0 flex-1">
        <DataTable
            bind:this={dataTable}
            data={rows}
            {columns}
            getRowId={(r) => String(r.id)}
            {loading}
            bind:sorting
            search={searchText}
            searchText={searchTextFor}
            groupBy={groupByClan}
            groupCompare={compareClans}
        />
    </div>
</div>

<Sidebar bind:this={accountSidebar}>
    {#if selectedAccount}
        <CocAccountSidebar account={selectedAccount as any} />
    {/if}
</Sidebar>
