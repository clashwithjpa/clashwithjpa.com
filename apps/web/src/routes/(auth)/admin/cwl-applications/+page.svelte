<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CwlAccountCell from "$lib/components/grid/CwlAccountCell.svelte";
    import CwlDiscordCell from "$lib/components/grid/CwlDiscordCell.svelte";
    import CwlNicknameCell from "$lib/components/grid/CwlNicknameCell.svelte";
    import CwlStatusCell from "$lib/components/grid/CwlStatusCell.svelte";
    import Toolbar from "$lib/components/Toolbar.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Dialog from "$lib/components/ui/Dialog.svelte";
    import Grid from "$lib/components/ui/Grid.svelte";
    import { svelteRenderer } from "$lib/components/ui/grid/SvelteCellRenderer";
    import Input from "$lib/components/ui/Input.svelte";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import UserCombobox, { type ComboboxUser } from "$lib/components/ui/UserCombobox.svelte";
    import { loadGuildNicknames } from "$lib/discordNicknames";
    import { formatDate, formatDateTime } from "$lib/utils";
    import { fadeIn } from "$lib/utils/animations";
    import {
        assignCwlApplication,
        assignCwlApplicationsBulk,
        createCwlApplication,
        deleteCwlApplicationsBulk,
        getAdminUsers,
        getCOCClanMembers,
        getCOCPlayer,
        getCwlApplications,
        getCwlSeasons,
        getJPACwlClans,
        getUserCocAccountsByUserId,
        updateCocAccountWarWeight,
        type GetCwlApplications200,
    } from "@repo/clashofclans-client";
    import type { GridApi, ICellRendererParams, IRowNode } from "ag-grid-community";
    import { untrack } from "svelte";
    import { toast } from "svelte-sonner";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerAlertTriangle from "~icons/tabler/alert-triangle";
    import TablerArrowsExchange from "~icons/tabler/arrows-exchange";
    import TablerCheck from "~icons/tabler/check";
    import TablerDownload from "~icons/tabler/download";
    import TablerListCheck from "~icons/tabler/list-check";
    import TablerRefresh from "~icons/tabler/refresh";
    import TablerShield from "~icons/tabler/shield";
    import TablerTrash from "~icons/tabler/trash";
    import TablerUserPlus from "~icons/tabler/user-plus";
    import TablerX from "~icons/tabler/x";

    type Application = GetCwlApplications200["data"]["applications"][number] & { discordNickname?: string };

    let { data }: { data: { canDelete: boolean } } = $props();

    let applications = $state<Application[]>([]);
    let clanOptions = $state<Option[]>([{ label: "Unassigned", value: "" }]);
    let clanNameByTag = $state<Record<string, string>>({});
    let total = $state(0);
    let loading = $state(true);
    let nicknamesLoading = $state(false);
    let nicknameLoadId = 0;
    let filterMode = $state<string>("all");
    let clanFilter = $state<string>("all");
    let seasons = $state<{ id: number; name: string }[]>([]);
    let selectedSeasonValue = $state<string>("");
    let seasonOptions = $derived<Option[]>(seasons.map((s) => ({ label: s.name, value: String(s.id) })));

    // Missing key = not yet fetched; `{ ok: false }` = fetch failed.
    type RosterEntry = { ok: true; tags: Set<string> } | { ok: false };
    let clanRosters = $state<Record<string, RosterEntry>>({});
    let rostersLoading = $state(false);

    function normalizeTag(tag: string | null | undefined): string {
        return (tag ?? "").trim().toUpperCase();
    }

    let gridApi = $state<GridApi | null>(null);
    let selectedIds = $state<number[]>([]);
    let bulkClan = $state<string>("");
    let bulkProcessing = $state(false);
    let searchText = $state("");
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

    function applySearch() {
        gridApi?.setGridOption("quickFilterText", searchText);
    }
    // Exclude the "Unassigned" entry so bulk assign can't accidentally mass-unassign.
    let bulkClanOptions = $derived(clanOptions.filter((o) => o.value !== ""));
    let displayedApplications = $derived(
        clanFilter === "all"
            ? applications
            : clanFilter === "wrong-clan"
              ? applications.filter((a) => joinedInfo(a).status === "wrong-clan")
              : applications.filter((a) => a.assignedTo === clanFilter),
    );
    let unassignedCount = $derived(displayedApplications.filter((a) => !a.assignedTo).length);

    async function loadClans() {
        try {
            const resp = await getJPACwlClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) {
                const clans = Object.values(resp.data.clans);
                clanOptions = [
                    { label: "Unassigned", value: "" },
                    ...clans.map((c) => ({ label: `${c.clanName} - ${c.clanLeague} (${c.clanTag})`, value: c.clanTag })),
                ];
                clanNameByTag = Object.fromEntries(clans.map((c) => [normalizeTag(c.clanTag), c.clanName]));
            }
        } catch {
            // ignore - selectors will still work without options
        }
    }

    async function loadSeasons() {
        try {
            const resp = await getCwlSeasons({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) seasons = resp.data.seasons;
        } catch {
            // season selector falls back to empty
        }
    }

    // --- Manual registration (latecomers after signups close) ---
    type LinkedCocAccount = { cocAccountTag: string; isExternal: boolean; name?: string; icon?: string };

    let registerOpen = $state(false);
    let selectedUser = $state<ComboboxUser | null>(null);
    let linkedAccounts = $state<LinkedCocAccount[]>([]);
    let loadingAccounts = $state(false);
    let registerCocTag = $state<string>("");
    let registerPreference = $state(1);
    let registerSeasonValue = $state<string>("");
    let registerSubmitting = $state(false);

    let registerAccountOptions = $derived<Option[]>(
        linkedAccounts.map((a) => ({
            label: `${a.cocAccountTag}${a.name ? ` - ${a.name}` : ""}${a.isExternal ? " (External)" : ""}`,
            value: a.cocAccountTag,
            icon: a.icon,
        })),
    );

    function openRegister() {
        selectedUser = null;
        linkedAccounts = [];
        registerCocTag = "";
        registerPreference = 1;
        registerSeasonValue = selectedSeasonValue || (seasons[0] ? String(seasons[0].id) : "");
        registerOpen = true;
    }

    async function searchUsers(query: string): Promise<ComboboxUser[]> {
        try {
            const resp = await getAdminUsers({ search: query, limit: 8 }, { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
            if (resp.success) return resp.data.users as ComboboxUser[];
        } catch {
            // return empty on failure
        }
        return [];
    }

    $effect(() => {
        const user = selectedUser;
        if (!user) {
            linkedAccounts = [];
            registerCocTag = "";
            loadingAccounts = false;
            return;
        }
        registerCocTag = "";
        linkedAccounts = [];
        loadingAccounts = true;
        getUserCocAccountsByUserId(user.id, { baseURL: PUBLIC_SERVER_URL, credentials: "include" })
            .then(async (resp) => {
                if (!resp.success) return;
                linkedAccounts = await Promise.all(
                    resp.data.accounts.map(async (acc) => {
                        try {
                            const playerData = await getCOCPlayer(encodeURIComponent(acc.cocAccountTag), {
                                baseURL: PUBLIC_SERVER_URL,
                                credentials: "include",
                            });
                            return {
                                cocAccountTag: acc.cocAccountTag,
                                isExternal: acc.isExternal,
                                name: playerData.data.player.name,
                                icon: `th/${playerData.data.player.townHallLevel}`,
                            };
                        } catch {
                            return { cocAccountTag: acc.cocAccountTag, isExternal: acc.isExternal };
                        }
                    }),
                );
            })
            .catch((e: any) => toast.error("Failed to load linked accounts", { description: e?.message }))
            .finally(() => (loadingAccounts = false));
    });

    async function submitRegister() {
        if (!selectedUser) {
            toast.error("Select a member first");
            registerOpen = true;
            return;
        }
        if (!registerCocTag) {
            toast.error("Select a Clash of Clans account");
            registerOpen = true;
            return;
        }
        const seasonId = registerSeasonValue ? Number(registerSeasonValue) : undefined;
        registerSubmitting = true;
        try {
            const resp = await createCwlApplication(
                { userId: selectedUser.id, tag: registerCocTag, preferenceNum: registerPreference || 1, seasonId },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                toast.success("CWL application registered");
                // Jump to the season we registered into (the effect reloads the roster),
                // or just reload if we're already viewing it.
                if (seasonId != null && String(seasonId) !== selectedSeasonValue) selectedSeasonValue = String(seasonId);
                else load();
            } else {
                const err = (resp as { error?: unknown }).error;
                toast.error(typeof err === "string" ? err : "Failed to register application");
                registerOpen = true;
            }
        } catch (e: any) {
            toast.error("Failed to register application", { description: e?.message });
            registerOpen = true;
        } finally {
            registerSubmitting = false;
        }
    }

    // --- CSV export (mirrors the bonus page) ---
    let downloading = $state(false);

    // Wraps a CSV cell so commas, quotes and newlines survive a round-trip.
    function csvCell(value: unknown): string {
        const s = value == null ? "" : String(value);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }

    const CSV_COLUMNS: { header: string; value: (a: Application) => unknown }[] = [
        { header: "Discord", value: (a) => a.discordUsername },
        { header: "Nickname", value: (a) => a.discordNickname ?? "" },
        { header: "Discord ID", value: (a) => a.discordUserId },
        { header: "Account", value: (a) => a.cocAccountName },
        { header: "Tag", value: (a) => a.cocAccountTag },
        { header: "Clan", value: (a) => a.cocAccountClan ?? "" },
        { header: "Preference", value: (a) => a.preferenceNum },
        { header: "Weight", value: (a) => a.cocAccountWeight },
        { header: "Applied", value: (a) => (a.appliedAt ? formatDateTime(a.appliedAt) : "") },
        { header: "Assigned Clan", value: (a) => (a.assignedTo ? (clanNameByTag[normalizeTag(a.assignedTo)] ?? a.assignedTo) : "") },
        {
            header: "Status",
            value: (a) => {
                const info = joinedInfo(a);
                return info.status === "wrong-clan" ? `wrong-clan: ${info.wrongClan}` : info.status;
            },
        },
    ];

    function downloadCsv() {
        downloading = true;
        try {
            const list = displayedApplications;
            const lines = [
                CSV_COLUMNS.map((c) => csvCell(c.header)).join(","),
                ...list.map((a) => CSV_COLUMNS.map((c) => csvCell(c.value(a))).join(",")),
            ];
            const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const seasonName = seasons.find((s) => String(s.id) === selectedSeasonValue)?.name;
            link.download = `cwl-applications${seasonName ? `-${seasonName.replace(/\s+/g, "-")}` : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${list.length} application${list.length === 1 ? "" : "s"}`);
        } catch (error) {
            toast.error("Failed to export CSV", { description: error instanceof Error ? error.message : undefined });
        } finally {
            downloading = false;
        }
    }

    async function load() {
        loading = true;
        try {
            const resp = await getCwlApplications(
                {
                    seasonId: selectedSeasonValue ? Number(selectedSeasonValue) : undefined,
                    unassigned: filterMode === "unassigned" ? true : undefined,
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
            );
            if (resp.success) {
                let list = resp.data.applications;
                if (filterMode === "assigned") list = list.filter((a) => a.assignedTo);
                applications = list.map((a) => ({ ...a }));
                total = resp.data.total;
                if (!selectedSeasonValue && resp.data.seasonId != null) selectedSeasonValue = String(resp.data.seasonId);
            } else {
                toast.error("Failed to load CWL applications");
            }
        } catch (e: any) {
            toast.error("Failed to load CWL applications", { description: e?.message });
        } finally {
            loading = false;
        }
        // Nicknames are fetched separately so the grid isn't blocked on the Discord
        // guild-member walk; the Nickname column shows a skeleton until they arrive.
        void loadNicknames();
    }

    async function loadNicknames() {
        const id = ++nicknameLoadId;
        nicknamesLoading = true;
        try {
            const nicknames = await loadGuildNicknames();
            if (id !== nicknameLoadId) return; // superseded by a newer load()
            applications = applications.map((a) => ({ ...a, discordNickname: nicknames[a.discordUserId] }));
        } finally {
            if (id === nicknameLoadId) nicknamesLoading = false;
        }
    }

    async function assign(id: number, clanTag: string) {
        try {
            const resp = await assignCwlApplication(
                id,
                { clanTag: clanTag || null },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (resp.success) {
                toast.success(clanTag ? "Application assigned" : "Application unassigned");
                return resp.data.application.assignedTo ?? "";
            }
            toast.error("Failed to assign application");
        } catch (e: any) {
            toast.error("Failed to assign application", { description: e?.message });
        }
        return null;
    }

    async function bulkAssign() {
        if (selectedIds.length === 0 || !bulkClan) return;
        bulkProcessing = true;
        const ids = selectedIds;
        try {
            const resp = await assignCwlApplicationsBulk(
                { ids, clanTag: bulkClan },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error("Failed to assign applications");
            const idSet = new Set(ids);
            applications = applications.map((a) => (idSet.has(a.id) ? { ...a, assignedTo: bulkClan } : a));
            toast.success(`${resp.data.count} application${resp.data.count === 1 ? "" : "s"} assigned to ${clanLabel(bulkClan)}`);
            clearSelection();
            bulkClan = "";
        } catch (e: any) {
            toast.error("Failed to assign applications", { description: e?.message });
            load();
        } finally {
            bulkProcessing = false;
        }
    }

    async function bulkDelete() {
        if (selectedIds.length === 0) return;
        bulkProcessing = true;
        const ids = selectedIds;
        try {
            const resp = await deleteCwlApplicationsBulk(
                { ids },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );
            if (!resp.success) throw new Error("Failed to delete applications");
            const idSet = new Set(ids);
            applications = applications.filter((a) => !idSet.has(a.id));
            total = Math.max(0, total - resp.data.count);
            toast.success(`${resp.data.count} application${resp.data.count === 1 ? "" : "s"} deleted`);
            clearSelection();
        } catch (e: any) {
            toast.error("Failed to delete applications", { description: e?.message });
            load();
        } finally {
            bulkProcessing = false;
        }
    }

    function clearSelection() {
        gridApi?.deselectAll();
        selectedIds = [];
    }

    const AUTO_SELECT_COUNT = 30;
    function selectFirstUnassigned(count = AUTO_SELECT_COUNT) {
        if (!gridApi) return;
        const nodes: IRowNode<Application>[] = [];
        gridApi.forEachNodeAfterFilterAndSort((node) => {
            if (nodes.length >= count) return;
            if (node.data && !node.data.assignedTo) nodes.push(node);
        });
        gridApi.deselectAll();
        if (nodes.length === 0) {
            toast.info("No unassigned applications to select");
            return;
        }
        gridApi.setNodesSelected({ nodes, newValue: true });
        toast.success(`Selected ${nodes.length} unassigned application${nodes.length === 1 ? "" : "s"}`);
    }

    function clanLabel(clanTag: string | null | undefined): string {
        if (!clanTag) return "Unassigned";
        return clanOptions.find((o) => o.value === clanTag)?.label ?? clanTag;
    }

    let assignedClanTags = $derived([...new Set(applications.filter((a) => a.assignedTo).map((a) => normalizeTag(a.assignedTo)))]);

    async function loadClanRosters(tags: string[]) {
        const missing = tags.filter((t) => t && !(t in clanRosters));
        if (missing.length === 0) return;
        rostersLoading = true;
        try {
            const results = await Promise.all(
                missing.map(async (tag): Promise<readonly [string, RosterEntry]> => {
                    try {
                        const resp = await getCOCClanMembers(encodeURIComponent(tag), { baseURL: PUBLIC_SERVER_URL, credentials: "include" });
                        if (resp.success) {
                            return [tag, { ok: true, tags: new Set(resp.data.clanMembers.items.map((m) => normalizeTag(m.tag))) }];
                        }
                    } catch {
                        // fetch failed — recorded below
                    }
                    return [tag, { ok: false }];
                }),
            );
            clanRosters = { ...clanRosters, ...Object.fromEntries(results) };
        } finally {
            rostersLoading = false;
        }
    }

    function retryRoster(clanTag: string) {
        const tag = normalizeTag(clanTag);
        const { [tag]: _removed, ...rest } = clanRosters;
        clanRosters = rest;
        loadClanRosters([tag]);
    }

    type JoinStatus = "joined" | "wrong-clan" | "missing" | "error" | "unknown" | "";
    function joinedInfo(app: Application | undefined): { status: JoinStatus; wrongClan: string } {
        if (!app?.assignedTo) return { status: "", wrongClan: "" };
        const assignedTag = normalizeTag(app.assignedTo);
        const accountTag = normalizeTag(app.cocAccountTag);
        const assigned = clanRosters[assignedTag];
        if (assigned?.ok && assigned.tags.has(accountTag)) return { status: "joined", wrongClan: "" };
        // An account is only ever in one clan, so a match in a different clan is definitive.
        for (const [tag, entry] of Object.entries(clanRosters)) {
            if (tag === assignedTag || !entry.ok) continue;
            if (entry.tags.has(accountTag)) return { status: "wrong-clan", wrongClan: clanNameByTag[tag] ?? tag };
        }
        if (!assigned) return { status: "unknown", wrongClan: "" };
        if (!assigned.ok) return { status: "error", wrongClan: "" };
        return { status: "missing", wrongClan: "" };
    }

    type ClanState = "loading" | "ok" | "error";
    type ClanStat = { clanTag: string; name: string; total: number; joined: number; state: ClanState };
    let clanStats = $derived.by(() => {
        const map = new Map<string, ClanStat>();
        for (const a of applications) {
            if (!a.assignedTo) continue;
            const tag = normalizeTag(a.assignedTo);
            const entry = clanRosters[tag];
            let stat = map.get(tag);
            if (!stat) {
                const state: ClanState = !entry ? "loading" : entry.ok ? "ok" : "error";
                stat = { clanTag: a.assignedTo, name: clanNameByTag[tag] ?? a.assignedTo, total: 0, joined: 0, state };
                map.set(tag, stat);
            }
            stat.total++;
            if (entry?.ok && entry.tags.has(normalizeTag(a.cocAccountTag))) stat.joined++;
        }
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    });
    let totalAssigned = $derived(clanStats.reduce((n, s) => n + s.total, 0));
    let totalJoined = $derived(clanStats.reduce((n, s) => n + s.joined, 0));
    let erroredClans = $derived(clanStats.filter((s) => s.state === "error").length);
    let wrongClanCount = $derived(applications.filter((a) => joinedInfo(a).status === "wrong-clan").length);

    loadClans();
    loadSeasons();
    $effect(() => {
        filterMode; // track
        selectedSeasonValue; // track
        load();
    });
    // untrack so reading the roster cache inside doesn't re-trigger this effect.
    $effect(() => {
        const tags = assignedClanTags; // track
        untrack(() => loadClanRosters(tags));
    });
    $effect(() => {
        clanRosters; // track
        gridApi?.refreshCells({ force: true, columns: ["joinedStatus"] });
    });
    $effect(() => {
        nicknamesLoading; // track
        gridApi?.refreshCells({ force: true, columns: ["discordNickname"] });
    });
</script>

<Seo title="CWL Applications" description="Manage CWL applications and assign players to clans" />

<div in:fadeIn class="relative flex size-full flex-col gap-4 overflow-hidden">
    <div class="flex flex-col gap-4 px-4 pt-4">
        <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <h1 class="text-2xl font-bold">CWL Applications</h1>
                <p class="text-sm text-stone-400">
                    {#if displayedApplications.length !== total}
                        {displayedApplications.length} of {total} application{total === 1 ? "" : "s"}
                    {:else}
                        {total} application{total === 1 ? "" : "s"}
                    {/if}
                </p>
            </div>
            <div class="flex flex-col gap-2 lg:flex-row lg:items-center">
                {#if seasonOptions.length > 0}
                    <div class="w-full lg:w-44">
                        <Select options={seasonOptions} bind:value={selectedSeasonValue} placeholder="Season" />
                    </div>
                {/if}
                <div class="flex items-center gap-2">
                    <Input placeholder="Search anything..." bind:value={searchText} oninput={applySearch} class="w-full lg:w-80" />
                    <Button
                        variant="success"
                        onclick={openRegister}
                        class="w-full shrink-0 gap-2 lg:w-fit"
                        tooltip="Register a member for CWL"
                        tooltipPlacement="bottom"
                    >
                        <TablerUserPlus class="size-5" />
                    </Button>
                    <Button
                        variant="base"
                        disabled={downloading || displayedApplications.length === 0}
                        onclick={downloadCsv}
                        class="w-full shrink-0 gap-2 lg:w-fit"
                        tooltip="Export applications as CSV"
                        tooltipPlacement="bottom"
                    >
                        {#if downloading}
                            <SvgSpinnersRingResize class="size-5" />
                        {:else}
                            <TablerDownload class="size-5" />
                        {/if}
                    </Button>
                    <Button
                        variant="base"
                        disabled={unassignedCount === 0}
                        onclick={() => selectFirstUnassigned()}
                        class="w-full shrink-0 gap-2 lg:w-fit"
                        tooltip="Select the first {AUTO_SELECT_COUNT} unassigned applications in the current order (sort by Weight first)"
                        tooltipPlacement="bottom"
                    >
                        <TablerListCheck class="size-5" />
                    </Button>
                </div>
            </div>
        </div>

        {#if clanStats.length > 0}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                bind:this={scrollEl}
                onmousedown={onDragStart}
                class="edge-fade flex cursor-grab items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden {isDragging ? 'select-none' : ''}"
                style="scrollbar-width: none;"
            >
                <span class="flex shrink-0 items-center gap-1.5 text-sm font-medium text-stone-200">
                    {totalJoined} / {totalAssigned} joined their CWL clan
                    {#if rostersLoading}
                        <SvgSpinnersRingResize class="size-3.5 text-stone-400" />
                    {/if}
                </span>
                {#if erroredClans > 0}
                    <Badge
                        icon={TablerAlertTriangle}
                        content="Couldn't check {erroredClans} clan{erroredClans === 1 ? '' : 's'}"
                        variant="red"
                        size="button"
                        iconSize="size-4"
                        class="shrink-0"
                    />
                {/if}
                {#if wrongClanCount > 0}
                    {@const isWrongClanActive = clanFilter === "wrong-clan"}
                    <Badge
                        icon={TablerArrowsExchange}
                        content="{wrongClanCount} in different clan"
                        variant="blue"
                        iconSize="size-4"
                        onclick={() => (clanFilter = isWrongClanActive ? "all" : "wrong-clan")}
                        size="button"
                        class="shrink-0 {isWrongClanActive ? '' : clanFilter !== 'all' ? 'opacity-50 hover:opacity-100' : ''}"
                    />
                {/if}
                <div class="h-4 w-px shrink-0 bg-stone-700"></div>
                {#each clanStats as stat (stat.clanTag)}
                    {@const isActive = clanFilter === stat.clanTag}
                    {@const isMaxed = stat.joined === stat.total}
                    {@const variant = stat.state === "ok" ? (isMaxed ? "green" : "yellow") : stat.state === "loading" ? "blue" : "red"}
                    {@const statusText =
                        stat.state === "ok" ? `${stat.joined}/${stat.total}` : stat.state === "loading" ? `…/${stat.total}` : "failed"}

                    <div class="flex shrink-0 items-center gap-2">
                        <Badge
                            icon={stat.state === "loading" ? SvgSpinnersRingResize : TablerShield}
                            content="{stat.name} • {statusText}"
                            {variant}
                            iconSize="size-4"
                            onclick={() => (clanFilter = isActive ? "all" : stat.clanTag)}
                            size="button"
                            class="font-medium {isActive ? '' : clanFilter !== 'all' ? 'opacity-50 hover:opacity-100' : ''}"
                        />
                        {#if stat.state !== "ok" && stat.state !== "loading"}
                            <Badge icon={TablerRefresh} variant="red" size="button" onclick={() => retryRoster(stat.clanTag)} iconSize="size-4" />
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <div class="flex-1">
        <Grid
            rowData={displayedApplications}
            gridOptions={{
                rowHeight: 56,
                getRowId: (p) => String(p.data.id),
                rowSelection: { mode: "multiRow", checkboxes: true, headerCheckbox: true, enableClickSelection: false },
                onGridReady: (params) => {
                    gridApi = params.api;
                },
                onSelectionChanged: (event) => {
                    selectedIds = event.api.getSelectedRows().map((r) => r.id);
                },
                onCellValueChanged: async (event) => {
                    if (event.oldValue === event.newValue) return;
                    if (event.colDef.field === "cocAccountWeight") {
                        const warWeight = Number(event.newValue);
                        if (!Number.isInteger(warWeight) || warWeight < 0) {
                            toast.error("Weight must be a non-negative whole number");
                            event.data.cocAccountWeight = event.oldValue;
                            event.api.refreshCells({ rowNodes: [event.node], columns: ["cocAccountWeight"], force: true });
                            return;
                        }
                        try {
                            const resp = await updateCocAccountWarWeight(
                                event.data.cocAccountId,
                                { warWeight },
                                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
                            );
                            if (resp.success) {
                                event.data.cocAccountWeight = resp.data.account.warWeight;
                                toast.success(`Weight updated for ${event.data.cocAccountName}`);
                            } else {
                                throw new Error();
                            }
                        } catch (e: any) {
                            toast.error("Failed to update weight", { description: e?.message });
                            event.data.cocAccountWeight = event.oldValue;
                        }
                        event.api.refreshCells({ rowNodes: [event.node], columns: ["cocAccountWeight"], force: true });
                        return;
                    }
                    if (event.colDef.field !== "assignedTo") return;
                    const result = await assign(event.data.id, event.newValue || "");
                    event.data.assignedTo = result ?? event.oldValue;
                    event.api.refreshCells({ rowNodes: [event.node], columns: ["assignedTo", "joinedStatus"], force: true });
                },
            }}
            columnDefs={[
                {
                    headerName: "Discord",
                    field: "discordUsername",
                    sortable: true,
                    filter: false,
                    cellRenderer: svelteRenderer(CwlDiscordCell),
                    getQuickFilterText: (p) => `${p.data.discordUsername} ${p.data.discordUserId}`,
                },
                {
                    headerName: "Nickname",
                    field: "discordNickname",
                    sortable: true,
                    filter: false,
                    cellRenderer: svelteRenderer(CwlNicknameCell),
                    cellRendererParams: () => ({ loading: nicknamesLoading }),
                },
                {
                    headerName: "Account",
                    field: "cocAccountName",
                    sortable: true,
                    filter: false,
                    cellRenderer: svelteRenderer(CwlAccountCell),
                    getQuickFilterText: (p) => `${p.data.cocAccountName} ${p.data.cocAccountTag}`,
                },
                {
                    headerName: "Clan",
                    field: "cocAccountClan",
                    sortable: true,
                    filter: false,
                    valueFormatter: (p) => p.value || "—",
                },
                { headerName: "Pref.", field: "preferenceNum", sortable: true, filter: false },
                {
                    headerName: "Weight",
                    field: "cocAccountWeight",
                    sortable: true,
                    filter: false,
                    editable: true,
                    cellEditor: "uiInputEditor",
                    cellEditorParams: { type: "number" },
                    valueParser: (p) => Number(p.newValue),
                    valueFormatter: (p) => (p.value != null ? Number(p.value).toLocaleString() : ""),
                },
                {
                    headerName: "Applied",
                    field: "appliedAt",
                    sortable: true,
                    sort: "desc",
                    filter: false,
                    valueFormatter: (p) => (p.value ? formatDate(p.value) : ""),
                    tooltipValueGetter: (p) => (p.value ? formatDateTime(p.value) : ""),
                },
                {
                    headerName: "Assigned clan",
                    field: "assignedTo",
                    sortable: true,
                    filter: false,
                    editable: true,
                    cellEditorPopup: true,
                    cellEditor: "uiSelectEditor",
                    cellEditorParams: () => ({ options: clanOptions }),
                    valueGetter: (p) => p.data?.assignedTo ?? "",
                    valueFormatter: (p) => clanLabel(p.value),
                    getQuickFilterText: (p) => clanLabel(p.value),
                },
                {
                    headerName: "Status",
                    colId: "joinedStatus",
                    sortable: true,
                    filter: false,
                    cellRenderer: svelteRenderer(CwlStatusCell),
                    cellRendererParams: (p: ICellRendererParams) => ({ wrongClan: joinedInfo(p.data).wrongClan }),
                    valueGetter: (p) => joinedInfo(p.data).status,
                    getQuickFilterText: (p) => {
                        const info = joinedInfo(p.data);
                        return `${info.status} ${info.wrongClan}`.trim();
                    },
                },
            ]}
        />
    </div>

    {#if selectedIds.length > 0}
        <Toolbar class="flex-col items-start lg:flex-row lg:items-center">
            <span class="text-sm font-medium whitespace-nowrap text-stone-200">{selectedIds.length} selected</span>
            <div class="flex w-full gap-2">
                <Select bind:value={bulkClan} options={bulkClanOptions} placeholder="Assign to..." />
                <Button
                    variant="success"
                    disabled={bulkProcessing || !bulkClan}
                    onclick={bulkAssign}
                    tooltip="Assign to clan"
                    tooltipPlacement="bottom"
                >
                    {#if bulkProcessing}
                        <SvgSpinnersRingResize class="size-5" />
                    {:else}
                        <TablerCheck class="size-5" />
                    {/if}
                </Button>
                {#if data.canDelete}
                    <ConfirmationDialog
                        title="Delete applications?"
                        description="Permanently delete {selectedIds.length} selected CWL application{selectedIds.length === 1
                            ? ''
                            : 's'}. This cannot be undone."
                        confirmText="Delete"
                        onConfirm={bulkDelete}
                    >
                        <Button variant="danger" disabled={bulkProcessing} tooltip="Delete selected" tooltipPlacement="bottom">
                            <TablerTrash class="size-5" />
                        </Button>
                    </ConfirmationDialog>
                {/if}
                <Button variant="ghost" disabled={bulkProcessing} onclick={clearSelection} tooltip="Clear selection" tooltipPlacement="bottom">
                    <TablerX class="size-5" />
                </Button>
            </div>
        </Toolbar>
    {/if}
</div>

<Dialog
    bind:open={registerOpen}
    title="Register for CWL"
    description="Manually add a CWL application for a member joining after signups closed. Their Discord and Clash of Clans accounts must already be linked."
    confirmText={registerSubmitting ? "Registering…" : "Register"}
    onConfirm={submitRegister}
>
    <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
            <p class="text-sm font-medium">Member</p>
            <UserCombobox bind:value={selectedUser} search={searchUsers} placeholder="Search by name or Discord id…" />
        </div>

        <div class="flex flex-col gap-1">
            <p class="text-sm font-medium">Clash of Clans account</p>
            {#if !selectedUser}
                <p class="text-xs text-stone-500">Select a member first.</p>
            {:else if loadingAccounts}
                <div class="flex items-center gap-2 text-xs text-stone-400">
                    <SvgSpinnersRingResize class="size-4" /> Loading linked accounts…
                </div>
            {:else if linkedAccounts.length === 0}
                <p class="text-xs text-amber-400">This member has no linked Clash of Clans accounts.</p>
            {:else}
                <Select options={registerAccountOptions} bind:value={registerCocTag} placeholder="Select account" />
            {/if}
        </div>

        <div class="flex gap-3">
            <div class="flex w-24 shrink-0 flex-col gap-1">
                <p class="text-sm font-medium">Preference</p>
                <Input type="number" min={1} max={99} bind:value={registerPreference} />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1">
                <p class="text-sm font-medium">Season</p>
                <Select options={seasonOptions} bind:value={registerSeasonValue} placeholder="Season" />
            </div>
        </div>
    </div>
</Dialog>
