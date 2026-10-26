<script lang="ts">
    /* eslint-disable @typescript-eslint/no-explicit-any */
    import CocAccountSidebar from "#lib/components/CocAccountSidebar.svelte";
    import BonusSeasonsCell from "#lib/components/grid/BonusSeasonsCell.svelte";
    import ClanCell from "#lib/components/grid/ClanCell.svelte";
    import CwlAccountCell from "#lib/components/grid/CwlAccountCell.svelte";
    import CwlAttacksCell from "#lib/components/grid/CwlAttacksCell.svelte";
    import CwlDiscordCell from "#lib/components/grid/CwlDiscordCell.svelte";
    import CwlFlagsCell from "#lib/components/grid/CwlFlagsCell.svelte";
    import CwlNicknameCell from "#lib/components/grid/CwlNicknameCell.svelte";
    import CwlStarsCell from "#lib/components/grid/CwlStarsCell.svelte";
    import Badge from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import Input from "#lib/components/ui/Input.svelte";
    import PageHeader from "#lib/components/ui/PageHeader.svelte";
    import Select, { type Option } from "#lib/components/ui/Select.svelte";
    import Seo from "#lib/components/ui/Seo.svelte";
    import { Sidebar } from "#lib/components/ui/sidebar/index.js";
    import Spinner from "#lib/components/ui/Spinner.svelte";
    import DataTable from "#lib/components/ui/table/DataTable.svelte";
    import type { TableColumn } from "#lib/components/ui/table/features.js";
    import { loadGuildNicknames } from "#lib/discordNicknames.js";
    import { toast } from "#lib/toast.js";
    import { formatRelativeTime } from "#lib/utils.js";
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
        type GetBonusDataStatus200,
        type GetCwlSeasonsStatus200,
        type GetCwlStatsStatus200,
    } from "@repo/clashofclans-client";
    import { renderComponent, renderSnippet, type SortingState } from "@tanstack/svelte-table";
    import TablerCircleCheck from "~icons/tabler/circle-check";
    import TablerCircleX from "~icons/tabler/circle-x";
    import TablerDownload from "~icons/tabler/download";
    import TablerShield from "~icons/tabler/shield";

    type BonusRow = GetBonusDataStatus200["data"]["rows"][number] & { discordNickname?: string };
    type Season = GetCwlSeasonsStatus200["data"]["seasons"][number];
    type CwlStat = GetCwlStatsStatus200["data"]["stats"][number];
    type CwlClanRecord = GetCwlStatsStatus200["data"]["clans"][number];
    // A bonus is per Discord user per season; each row carries the set of season
    // ids its owner has been awarded (shared across that user's accounts). CWL
    // attacks/stars are live-fetched when the page loads.
    type Row = BonusRow & {
        bonusSeasonIds: number[];
        cwlAttacks?: number;
        cwlStars?: number;
        cwlDetails?: CwlStat["details"];
        cwlStealRounds?: number[];
        cwlMissed?: number;
        cwlBenched?: number;
        cwlZeroStars?: number;
    };

    let rows = $state<Row[]>([]);
    let seasons = $state<Season[]>([]);
    let currentSeasonId = $state<number | null>(null);
    let currentSeasonName = $derived(seasons.find((s) => s.id === currentSeasonId)?.name ?? null);
    let pastSeasons = $derived(seasons.filter((s) => s.id !== currentSeasonId));
    let selectedSeasonValue = $state("");
    let seasonOptions = $derived<Option[]>(seasons.map((s) => ({ label: s.name, value: String(s.id) })));
    let total = $state(0);
    let loading = $state(true);
    let nicknamesLoading = $state(false);
    let nicknameLoadId = 0;
    let downloading = $state(false);
    let cwlFetchedAt = $state<number | null>(null);
    let searchText = $state("");
    let dataTable = $state<ReturnType<typeof DataTable<Row>> | null>(null);
    let displayedCount = $derived(dataTable?.getDisplayedCount() ?? 0);
    let activeFilters = $derived(dataTable?.getActiveFilterCount() ?? 0);
    let sorting = $state<SortingState>([{ id: "totalDonated", desc: true }]);

    // Mirrors the old bonus sheet: full attacks on the member's main (PN1) account.
    const isEligible = (r: Row) => (r.cwlAttacks ?? 0) >= 7 && r.preferenceNum === 1;

    // Flags mirror the old bonus sheet. B2B: a bonus in 3+ of the 6 seasons before this one.
    const B2B_WINDOW = 6;
    const B2B_MIN = 3;
    let b2bSeasonIds = $derived.by(() => {
        const i = seasons.findIndex((s) => s.id === currentSeasonId);
        return new Set(seasons.slice(i + 1, i + 1 + B2B_WINDOW).map((s) => s.id));
    });
    function b2bCount(r: Row) {
        const n = r.bonusSeasonIds.filter((id) => b2bSeasonIds.has(id)).length;
        return n >= B2B_MIN ? n : 0;
    }

    // Star steal: once the attacker already has 8★ this CWL, a hit on a base more than STEAL_REACH
    // places below them while some base at #1..position+STEAL_REACH was still untouched. If everything
    // in reach was already taken, they were cleaning up, not farming.
    const STEAL_REACH = 2;
    function isStarSteal(d: CwlStat["details"][number], starsBefore: number) {
        const reach = d.position + STEAL_REACH;
        return starsBefore >= 8 && d.defenderPosition > reach && d.firstOpenPosition != null && d.firstOpenPosition <= reach;
    }
    function starStealRounds(details: CwlStat["details"]) {
        let starsBefore = 0;
        const rounds: number[] = [];
        for (const d of [...details].sort((a, b) => a.round - b.round)) {
            if (isStarSteal(d, starsBefore)) rounds.push(d.round);
            starsBefore += d.stars;
        }
        return rounds;
    }

    // Top donor: among a clan's eligible players, the top donors up to its bonus
    // count (6 + war wins). Like the old sheet, it's a hint and not a pick.
    const BONUS_BASE = 6;
    let cwlRecords = $state<Map<string, CwlClanRecord> | null>(null);
    const bonusCount = (clanTag: string) => BONUS_BASE + (cwlRecords?.get(normalizeTag(clanTag))?.wins ?? 0);
    let topDonorIds = $derived.by(() => {
        const ids = new Set<number>();
        if (!cwlRecords) return ids;
        const byClan = new Map<string, Row[]>();
        for (const r of rows) {
            if (!r.assignedTo || !isEligible(r)) continue;
            byClan.set(r.assignedTo, [...(byClan.get(r.assignedTo) ?? []), r]);
        }
        for (const [tag, list] of byClan) {
            list.sort((a, b) => b.totalDonated - a.totalDonated)
                .slice(0, bonusCount(tag))
                .forEach((r) => ids.add(r.id));
        }
        return ids;
    });

    // Clan and eligibility filters narrow together; each side's counts follow the other's filter.
    let clanFilter = $state("");
    let eligibleFilter = $state<boolean | null>(null);
    const matchesClan = (r: Row) => !clanFilter || r.assignedTo === clanFilter;
    const matchesEligible = (r: Row) => eligibleFilter === null || isEligible(r) === eligibleFilter;
    let filteredRows = $derived(rows.filter((r) => matchesClan(r) && matchesEligible(r)));
    let clanBadges = $derived.by(() => {
        const counts = new Map<string, number>();
        for (const r of rows) {
            if (!r.assignedTo) continue;
            counts.set(r.assignedTo, (counts.get(r.assignedTo) ?? 0) + (matchesEligible(r) ? 1 : 0));
        }
        return [...counts.entries()]
            .map(([tag, count]) => ({ tag, name: cwlClanNameByTag[normalizeTag(tag)] ?? tag, count }))
            .sort((a, b) => a.name.localeCompare(b.name));
    });
    let eligibleCounts = $derived.by(() => {
        const inClan = rows.filter(matchesClan);
        const eligible = inClan.filter(isEligible).length;
        return { eligible, notEligible: inClan.length - eligible };
    });

    let scrollEl = $state<HTMLDivElement | null>(null);

    // Suppress the click that fires at the end of a drag-scroll so badges don't toggle.
    $effect(() => {
        const el = scrollEl;
        if (!el) return;
        function suppressClick(e: MouseEvent) {
            if (hasDragged) {
                e.stopPropagation();
                e.preventDefault();
                hasDragged = false;
            }
        }
        el.addEventListener("click", suppressClick, { capture: true });
        return () => el.removeEventListener("click", suppressClick, { capture: true });
    });

    let isDragging = $state(false);
    let hasDragged = false;
    let dragStartX = 0;
    let dragScrollLeft = 0;
    let dragCursorStyle: HTMLStyleElement | null = null;

    function onDragStart(e: MouseEvent) {
        if (!scrollEl) return;
        isDragging = true;
        hasDragged = false;
        dragStartX = e.pageX - scrollEl.offsetLeft;
        dragScrollLeft = scrollEl.scrollLeft;
        dragCursorStyle = document.createElement("style");
        dragCursorStyle.textContent = "* { cursor: grabbing !important; }";
        document.head.appendChild(dragCursorStyle);
        document.addEventListener("mousemove", onDragMove);
        document.addEventListener("mouseup", onDragEnd);
    }

    function onDragMove(e: MouseEvent) {
        if (!isDragging || !scrollEl) return;
        e.preventDefault();
        const dx = e.pageX - scrollEl.offsetLeft - dragStartX;
        if (Math.abs(dx) > 4) hasDragged = true;
        scrollEl.scrollLeft = dragScrollLeft - dx;
    }

    function onDragEnd() {
        isDragging = false;
        dragCursorStyle?.remove();
        dragCursorStyle = null;
        document.removeEventListener("mousemove", onDragMove);
        document.removeEventListener("mouseup", onDragEnd);
    }

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
    type StatField = "totalDonated" | "totalReceived";

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
            clanLabel(r.assignedTo),
            r.totalDonated,
            r.totalReceived,
            r.cwlAttacks,
            r.cwlStars,
            b2bCount(r) ? "b2b" : null,
            r.cwlStealRounds?.length ? "star steal" : null,
            r.cwlMissed ? "missed" : null,
            r.cwlBenched ? "benched" : null,
            r.cwlZeroStars ? "0★ zero star" : null,
            topDonorIds.has(r.id) ? "top donor" : null,
        ]
            .filter((v) => v != null)
            .join(" ");
    }

    function patchRows(match: (r: Row) => boolean, patch: (r: Row) => Partial<Row>) {
        rows = rows.map((r) => (match(r) ? { ...r, ...patch(r) } : r));
    }

    async function loadClans() {
        try {
            const resp = await getJPAClans({});
            if (resp.data) {
                clanNameByTag = Object.fromEntries(
                    Object.values(resp.data.data.clans).map((c) => [normalizeTag(c.clanTag), c.clanName ?? c.clanTag]),
                );
            }
        } catch {
            // Clan cells fall back to showing the raw tag.
        }
    }

    async function loadCwlClans() {
        try {
            const resp = await getJPACwlClans({});
            if (resp.data) {
                const clans = Object.values(resp.data.data.clans);
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
            const [bd, bl, ss] = await Promise.all([getBonusData({ query: { seasonId } }), getBonusLedger({}), getCwlSeasons({})]);
            if (!bd.data) {
                toast.error("Failed to load bonus data");
                return;
            }
            seasons = ss.data ? ss.data.data.seasons : [];
            // Bonus is per Discord user: collect the season ids each user has earned,
            // so all of that user's accounts render the same ticks.
            const seasonsByUser = new Map<string, number[]>();
            if (bl.data) {
                for (const b of bl.data.data.bonuses) {
                    const list = seasonsByUser.get(b.discordUserId) ?? [];
                    list.push(b.seasonId);
                    seasonsByUser.set(b.discordUserId, list);
                }
            }
            rows = bd.data.data.rows.map((r) => ({
                ...r,
                bonusSeasonIds: seasonsByUser.get(r.discordUserId) ?? [],
            }));
            total = bd.data.data.total;
            currentSeasonId = bd.data.data.seasonId;
            selectedSeasonValue = currentSeasonId != null ? String(currentSeasonId) : "";
            restoreCwlStats();
            if (cwlFetchedAt == null || Date.now() - cwlFetchedAt > CWL_STALE_MS) fetchCwlStats();
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

    // Fetched CWL stats are slow to get, so they're kept per season for the rest of
    // the tab's session and come back after navigating away or reloading.
    const CWL_CACHE_KEY = "jpa:bonus-cwl-stats:v3";
    // Live fetches are slow and hit the CoC API, so a recent fetch is reused instead of refetched on every visit.
    const CWL_STALE_MS = 10 * 60 * 1000;
    type CwlCache = Record<string, { fetchedAt: number; stats: CwlStat[]; clans: CwlClanRecord[] }>;

    function readCwlCache(): CwlCache {
        try {
            return JSON.parse(sessionStorage.getItem(CWL_CACHE_KEY) ?? "{}") as CwlCache;
        } catch {
            return {};
        }
    }

    function applyCwlStats(stats: CwlStat[], clans: CwlClanRecord[]) {
        const byTag = new Map(stats.map((s) => [s.tag.toUpperCase(), s]));
        const records = new Map(clans.map((c) => [normalizeTag(c.tag), c]));
        cwlRecords = records;
        rows = rows.map((r) => {
            const s = byTag.get(normalizeTag(r.cocAccountTag));
            const details = s?.details ?? [];
            const lineup = s?.rounds ?? [];
            const attacked = new Set(details.map((d) => d.round));
            // Members who never made a lineup count against the clan they were assigned to.
            const record = records.get(normalizeTag(s?.clanTag ?? r.assignedTo));
            return {
                ...r,
                cwlAttacks: s?.attacks ?? 0,
                cwlStars: s?.stars ?? 0,
                cwlDetails: details,
                cwlStealRounds: starStealRounds(details),
                cwlMissed: lineup.filter((round) => !attacked.has(round)).length,
                cwlBenched: record ? Math.max(0, record.endedRounds.length - lineup.length) : 0,
                cwlZeroStars: details.filter((d) => d.stars === 0).length,
            };
        });
    }

    function restoreCwlStats() {
        const cached = readCwlCache()[String(currentSeasonId)];
        cwlFetchedAt = cached?.fetchedAt ?? null;
        if (cached) applyCwlStats(cached.stats, cached.clans);
        else cwlRecords = null;
    }

    let fetchingCwl = $state(false);
    let cwlLoadId = 0;

    // Live-fetches CWL attacks/stars for the roster's season (assigned clans only).
    // The cache is written even if the page was left or the season changed, so a
    // later visit picks it up; the rows only take it if they're still that season's.
    async function fetchCwlStats() {
        const id = ++cwlLoadId;
        const seasonId = currentSeasonId;
        fetchingCwl = true;
        try {
            const resp = await getCwlStats({ query: { seasonId: seasonId ?? undefined } });
            if (!resp.data) throw new Error();
            const fetchedAt = Date.now();
            try {
                sessionStorage.setItem(
                    CWL_CACHE_KEY,
                    JSON.stringify({
                        ...readCwlCache(),
                        [String(seasonId)]: { fetchedAt, stats: resp.data.data.stats, clans: resp.data.data.clans },
                    }),
                );
            } catch {
                // Storage full or blocked; the rows below still get the stats.
            }
            if (id !== cwlLoadId) return;
            cwlFetchedAt = fetchedAt;
            applyCwlStats(resp.data.data.stats, resp.data.data.clans);
        } catch (error) {
            if (id === cwlLoadId) toast.error("Failed to fetch CWL stats", { description: error instanceof Error ? error.message : undefined });
        } finally {
            if (id === cwlLoadId) fetchingCwl = false;
        }
    }

    async function assign(row: Row, clanTag: string) {
        const previous = row.assignedTo;
        patchRows(
            (r) => r.id === row.id,
            () => ({ assignedTo: clanTag || null }),
        );
        try {
            const resp = await assignCwlApplication({ path: { id: row.id }, body: { clanTag: clanTag || null } });
            if (!resp.data) throw new Error();
            patchRows(
                (r) => r.id === row.id,
                () => ({ assignedTo: resp.data.data.application.assignedTo ?? null }),
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

    async function saveStat(row: Row, field: StatField, label: string, n: number) {
        if (!Number.isInteger(n) || n < 0) {
            toast.error(`${label} must be a non-negative whole number`);
            return;
        }
        const previous = row[field];
        const sameAccount = (r: Row) => r.cocAccountId === row.cocAccountId;
        patchRows(sameAccount, () => ({ [field]: n }));
        try {
            const resp = await updateCocAccountStats({ path: { id: row.cocAccountId }, body: { [field]: n } });
            if (!resp.data) throw new Error();
            patchRows(sameAccount, () => ({ [field]: (resp.data.data.account as Record<string, unknown>)[field] as number }));
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
        { header: "Assigned Clan", field: "assignedTo" },
        { header: "Town Hall", field: "townHall" },
        { header: "Total Donated", field: "totalDonated" },
        { header: "Total Received", field: "totalReceived" },
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
            const resp = await setUserSeasonBonus({ body: { discordUserId, seasonId, cocAccountTag: data.cocAccountTag, selected } });
            if (!resp.data) throw new Error();
            toast.success(`Bonus ${selected ? "awarded to" : "removed from"} ${data.discordUsername}`);
        } catch (error) {
            apply(!selected);
            toast.error("Failed to update bonus", { description: error instanceof Error ? error.message : undefined });
        }
    }

    // Season badge columns are sized to fit every badge, so none get clipped.
    const PAST_SEASON_LIMIT = 6;
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

    const hasBonus = (r: Row) => currentSeasonId != null && r.bonusSeasonIds.includes(currentSeasonId);

    let columns = $derived<TableColumn<Row>[]>([
        ...(currentSeasonId != null
            ? [
                  {
                      id: "thisSeasonBonus",
                      header: "Bonus",
                      size: 90,
                      minSize: 90,
                      enableSorting: false,
                      enableResizing: false,
                      cell: ({ row }) => renderSnippet(bonusCheckbox, row.original),
                      meta: { cellClass: "px-0" },
                  } satisfies TableColumn<Row>,
              ]
            : []),
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
            cell: ({ row }) =>
                renderComponent(CwlAccountCell, {
                    account: row.original,
                    eligible: isEligible(row.original),
                    onOpen: () => openAccountSidebar(row.original),
                }),
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
        {
            accessorKey: "cwlAttacks",
            header: "CWL Attacks",
            size: 130,
            sortUndefined: "last",
            cell: ({ row }) => renderComponent(CwlAttacksCell, { attacks: row.original.cwlAttacks, loading: fetchingCwl }),
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
                    loading: fetchingCwl,
                    attacks: row.original.cwlAttacks,
                    details: row.original.cwlDetails,
                    stealRounds: row.original.cwlStealRounds,
                }),
        },
        {
            id: "flags",
            header: "Flags",
            size: 280,
            enableSorting: false,
            cell: ({ row }) =>
                renderComponent(CwlFlagsCell, {
                    topDonorOf: topDonorIds.has(row.original.id) && row.original.assignedTo ? bonusCount(row.original.assignedTo) : 0,
                    b2b: b2bCount(row.original),
                    missed: row.original.cwlMissed ?? 0,
                    zeroStars: row.original.cwlZeroStars ?? 0,
                    starSteals: row.original.cwlStealRounds?.length ?? 0,
                    benched: row.original.cwlBenched ?? 0,
                    loading: fetchingCwl && row.original.cwlStealRounds == null,
                }),
        },
        {
            id: "pastBonuses",
            header: "Past Bonuses",
            size: seasonsWidth(pastSeasons.slice(0, PAST_SEASON_LIMIT)) + (pastSeasons.length > PAST_SEASON_LIMIT ? 90 : 0),
            enableSorting: false,
            cell: ({ row }) =>
                renderComponent(BonusSeasonsCell, {
                    seasons: pastSeasons,
                    limit: PAST_SEASON_LIMIT,
                    awarded: row.original.bonusSeasonIds,
                    onToggle: (seasonId: number, selected: boolean) => toggleBonus(row.original, seasonId, selected),
                }),
        },
    ]);

    load();
    loadClans();
    loadCwlClans();
</script>

{#snippet bonusCheckbox(row: Row)}
    <Input
        type="checkbox"
        class="mx-auto"
        checked={hasBonus(row)}
        onclick={() => toggleBonus(row, currentSeasonId!, !hasBonus(row))}
        aria-label="Award {currentSeasonName ?? 'this season'} bonus to {row.discordUsername}"
    />
{/snippet}

<Seo title="CWL Bonus" description="Assign CWL bonuses and review linked account stats." />

<div class="relative flex size-full flex-col gap-4 overflow-hidden">
    <div class="flex flex-col gap-4 px-4 pt-4">
        <PageHeader title="CWL Bonus" subtitleLoading={loading}>
            {#snippet subtitle()}
                {#if !loading}
                    {#if currentSeasonName}<span class="font-medium text-stone-300">{currentSeasonName}</span> ·
                    {/if}
                    {#if searchText.trim() || activeFilters || clanFilter || eligibleFilter !== null}{displayedCount} of {total}{:else}{total}{/if} entr{total ===
                    1
                        ? "y"
                        : "ies"}
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
                    ·
                    {#if fetchingCwl}
                        fetching attacks…
                    {:else if cwlFetchedAt}
                        attacks from {formatRelativeTime(new Date(cwlFetchedAt))}
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
                    disabled={downloading || rows.length === 0}
                    onclick={downloadCsv}
                    tooltip="Download as CSV"
                    tooltipPlacement="bottom"
                >
                    {#if downloading}
                        <Spinner class="size-5" />
                    {:else}
                        <TablerDownload class="size-5" />
                    {/if}
                </Button>
            {/snippet}
        </PageHeader>

        {#if !loading && seasons.length === 0}
            <div class="text-xs text-stone-400">
                No CWL seasons yet — create one in <span class="font-medium text-stone-300">Settings</span> to start awarding bonuses.
            </div>
        {/if}

        {#if loading}
            <div class="flex items-center gap-2 overflow-hidden" aria-hidden="true">
                {#each { length: 9 }, i (i)}
                    <div class="h-6.5 w-33 shrink-0 skeleton rounded-lg"></div>
                {/each}
            </div>
        {:else if rows.length > 0}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                bind:this={scrollEl}
                onmousedown={onDragStart}
                class="edge-fade flex cursor-grab items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden {isDragging ? 'select-none' : ''}"
                style="scrollbar-width: none;"
            >
                {#each clanBadges as c (c.tag)}
                    {@const isActive = clanFilter === c.tag}
                    <Badge
                        icon={TablerShield}
                        content="{c.name} • {c.count}"
                        variant="blue"
                        size="button"
                        iconSize="size-4"
                        onclick={() => (clanFilter = isActive ? "" : c.tag)}
                        class="font-medium {isActive ? '' : clanFilter ? 'opacity-50 hover:opacity-100' : ''}"
                    />
                {/each}

                {#if clanBadges.length > 0}
                    <div class="h-6 shrink-0 self-center border-l-2 border-stone-700/50"></div>
                {/if}

                <Badge
                    icon={fetchingCwl ? Spinner : TablerCircleCheck}
                    content="Eligible • {eligibleCounts.eligible}"
                    variant="green"
                    size="button"
                    iconSize="size-4"
                    onclick={() => (eligibleFilter = eligibleFilter === true ? null : true)}
                    class="font-medium {eligibleFilter === true ? '' : eligibleFilter !== null ? 'opacity-50 hover:opacity-100' : ''}"
                />
                <Badge
                    icon={fetchingCwl ? Spinner : TablerCircleX}
                    content="Not Eligible • {eligibleCounts.notEligible}"
                    variant="red"
                    size="button"
                    iconSize="size-4"
                    onclick={() => (eligibleFilter = eligibleFilter === false ? null : false)}
                    class="font-medium {eligibleFilter === false ? '' : eligibleFilter !== null ? 'opacity-50 hover:opacity-100' : ''}"
                />
            </div>
        {/if}
    </div>

    <div class="min-h-0 flex-1">
        <DataTable
            bind:this={dataTable}
            data={filteredRows}
            {columns}
            getRowId={(r) => String(r.id)}
            {loading}
            bind:sorting
            search={searchText}
            searchText={searchTextFor}
            groupBy={groupByClan}
            groupCompare={compareClans}
            rowClass={(r) => hasBonus(r) && "*:bg-amber-400/10"}
        />
    </div>
</div>

<Sidebar bind:this={accountSidebar}>
    {#if selectedAccount}
        <CocAccountSidebar account={selectedAccount as any} />
    {/if}
</Sidebar>
