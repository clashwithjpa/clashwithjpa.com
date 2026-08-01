<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CwlClanFormSidebar from "$lib/components/CwlClanFormSidebar.svelte";
    import Badge from "$lib/components/ui/Badge.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { Sidebar } from "$lib/components/ui/sidebar";
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
    type LeagueTier = { key: string; label: string; variant: "red" | "purple" | "blue" | "yellow" | "orange" | "ghost"; order: number };

    const LEAGUE_TIERS: LeagueTier[] = [
        { key: "champion", label: "Champion", variant: "red", order: 6 },
        { key: "master", label: "Master", variant: "purple", order: 5 },
        { key: "crystal", label: "Crystal", variant: "blue", order: 4 },
        { key: "gold", label: "Gold", variant: "yellow", order: 3 },
        { key: "silver", label: "Silver", variant: "ghost", order: 2 },
        { key: "bronze", label: "Bronze", variant: "orange", order: 1 },
    ];
    const UNRANKED: LeagueTier = { key: "unranked", label: "Unranked", variant: "ghost", order: 0 };

    // Leagues come from the CoC API as "<Tier> League <I|II|III>", I being the strongest division.
    const DIVISIONS: Record<string, number> = { I: 1, II: 2, III: 3 };

    function leagueTier(league: string): LeagueTier {
        const name = (league || "").trim();
        const known = LEAGUE_TIERS.find((tier) => name.toLowerCase().includes(tier.key));
        if (known) return known;
        if (!name || name.toLowerCase().startsWith("unranked")) return UNRANKED;
        // A league added after this list was written — bucket it on its own name instead of
        // mislabelling it "Unranked", and assume it outranks Champion until it's added above.
        const label = name.split(" ")[0];
        return { key: label.toLowerCase(), label, variant: "ghost", order: 7 };
    }

    function leagueDivision(league: string): number {
        const last = (league || "").trim().split(" ").at(-1) ?? "";
        return DIVISIONS[last.toUpperCase()] ?? 0;
    }

    let clans = $state<CwlClan[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let syncing = $state(false);
    let removing = $state<string | null>(null);
    let searchText = $state("");
    let leagueFilter = $state<string | null>(null);

    let clanSidebar: Sidebar | null = $state(null);
    // Name, league and leader are auto-managed (fetched on add, refreshed on sync),
    // so the only thing a manager enters is the tag.
    let form = $state({ cocClanTag: "" });

    function errMsg(error: unknown, fallback: string) {
        return typeof error === "string" ? error : fallback;
    }

    let filteredClans = $derived(
        clans.filter((clan) => {
            if (leagueFilter && leagueTier(clan.cocClanLeague).key !== leagueFilter) return false;
            const query = searchText.toLowerCase();
            return (
                clan.cocClanName.toLowerCase().includes(query) ||
                clan.cocClanTag.toLowerCase().includes(query) ||
                clan.cocClanLeague.toLowerCase().includes(query) ||
                clan.cocClanLeader.toLowerCase().includes(query)
            );
        }),
    );

    function handleLeagueFilter(tier: string) {
        leagueFilter = leagueFilter === tier ? null : tier;
    }

    // Drag-to-scroll for the league badge bar (mirrors the users and CWL application bars).
    let scrollEl = $state<HTMLDivElement | null>(null);
    let isDragging = $state(false);
    let hasDragged = false;
    let dragStartX = 0;
    let dragScrollLeft = 0;
    let dragCursorStyle: HTMLStyleElement | null = null;

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

    // Counted across every clan, not the filtered ones, so the chips stay put while searching.
    let tierCounts = $derived.by(() => {
        const tiers = new Map<string, LeagueTier & { count: number }>();
        for (const clan of clans) {
            const tier = leagueTier(clan.cocClanLeague);
            const seen = tiers.get(tier.key);
            if (seen) seen.count++;
            else tiers.set(tier.key, { ...tier, count: 1 });
        }
        return [...tiers.values()].sort((a, b) => b.order - a.order);
    });

    let groupedClans = $derived.by(() => {
        const groups = new Map<string, CwlClan[]>();
        for (const clan of filteredClans) {
            const league = clan.cocClanLeague || UNRANKED.label;
            const group = groups.get(league);
            if (group) group.push(clan);
            else groups.set(league, [clan]);
        }
        const sorted = [...groups.entries()]
            .map(([league, group]) => ({
                league,
                tier: leagueTier(league),
                division: leagueDivision(league),
                clans: [...group].sort((a, b) => a.cocClanName.localeCompare(b.cocClanName)),
            }))
            .sort((a, b) => b.tier.order - a.tier.order || a.division - b.division || a.league.localeCompare(b.league));

        // Running index so the stagger doesn't restart inside every league.
        let offset = 0;
        return sorted.map((group) => {
            const startIndex = offset;
            offset += group.clans.length;
            return { ...group, startIndex };
        });
    });

    $effect(() => {
        if (leagueFilter && !tierCounts.some((tier) => tier.key === leagueFilter)) leagueFilter = null;
    });

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

<div class="flex size-full flex-col gap-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
            <h1 class="text-2xl font-bold">CWL Clans</h1>
            <p class="text-sm text-stone-400">Add or remove the clans available for Clan War League assignments.</p>
        </div>
        {#if !loading}
            <div class="flex items-center gap-2">
                {#if clans.length > 0}
                    <Input
                        placeholder="Search by clan name, tag, league, or leader..."
                        bind:value={searchText}
                        class="min-w-0 flex-1 sm:w-64 sm:flex-none"
                    />
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
                            <SvgSpinnersRingResize class="size-5 shrink-0" />
                        {:else}
                            <TablerRefresh class="size-5 shrink-0" />
                        {/if}
                    </span>
                </Button>
                <Button onclick={openAdd} class="shrink-0" tooltip="Add a new CWL clan by its tag (e.g. #CLANTAG)" tooltipPlacement="bottom">
                    <span class="flex items-center gap-2"><TablerPlus class="size-5 shrink-0" /></span>
                </Button>
            </div>
        {/if}
    </div>

    {#if !loading && tierCounts.length > 0}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            bind:this={scrollEl}
            onmousedown={onDragStart}
            class="edge-fade flex cursor-grab items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden {isDragging ? 'select-none' : ''}"
            style="scrollbar-width: none;"
        >
            {#each tierCounts as tier (tier.key)}
                {@const isActive = leagueFilter === tier.key}
                <Badge
                    icon={TablerShield}
                    content="{tier.label} • {tier.count}"
                    variant={tier.variant}
                    size="button"
                    iconSize="size-4"
                    onclick={() => handleLeagueFilter(tier.key)}
                    class="shrink-0 font-medium {isActive ? '' : leagueFilter !== null ? 'opacity-50 hover:opacity-100' : ''}"
                />
            {/each}
        </div>
    {/if}

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
            <p class="text-sm">No clans match your {leagueFilter ? "filters" : "search"}.</p>
        </div>
    {:else}
        <div class="flex flex-col gap-6">
            {#each groupedClans as group (group.league)}
                <section class="flex flex-col gap-4">
                    <div class="flex items-center gap-2">
                        <h2 class="truncate text-sm font-semibold text-stone-200">{group.league}</h2>
                        <Badge variant={group.tier.variant} content={String(group.clans.length)} />
                        <div class="h-0 flex-1 border-t-2 border-stone-700/50"></div>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {#each group.clans as clan, i (clan.cocClanTag)}
                            <div
                                class="stagger-card @container flex h-full flex-col justify-between gap-3 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4"
                                style="--i:{group.startIndex + i}"
                            >
                                <div class="flex min-w-0 gap-3">
                                    <TablerShield class="mt-0.5 size-6 shrink-0 text-stone-400" />
                                    <div class="min-w-0 flex-1">
                                        <h3 class="truncate font-semibold text-stone-50">
                                            {clan.cocClanName}
                                        </h3>
                                        <p class="truncate text-xs text-stone-400">{clan.cocClanTag}</p>
                                        <p class="truncate text-xs text-stone-400">Leader: {clan.cocClanLeader}</p>
                                        <Badge class="mt-2" variant={group.tier.variant} content={clan.cocClanLeague} />
                                    </div>
                                </div>
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
                                                <SvgSpinnersRingResize class="54 shrink-0" /> Removing
                                            </span>
                                        {:else}
                                            <span class="flex items-center justify-center gap-2">
                                                <TablerTrash class="54 shrink-0" /> Remove
                                            </span>
                                        {/if}
                                    </Button>
                                </ConfirmationDialog>
                            </div>
                        {/each}
                    </div>
                </section>
            {/each}
        </div>
    {/if}
</div>

<Sidebar bind:this={clanSidebar}>
    <CwlClanFormSidebar bind:form {saving} onSubmit={createClan} onCancel={closeSidebar} />
</Sidebar>
