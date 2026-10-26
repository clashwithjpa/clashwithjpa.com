<script lang="ts">
    import Avatar from "#lib/components/ui/Avatar.svelte";
    import Badge from "#lib/components/ui/Badge.svelte";
    import Button from "#lib/components/ui/Button.svelte";
    import RoleBadge from "#lib/components/ui/RoleBadge.svelte";
    import Tabs from "#lib/components/ui/Tabs.svelte";
    import Tooltip from "#lib/components/ui/Tooltip.svelte";
    import TownHall from "#lib/components/ui/TownHall.svelte";
    import type { Role } from "#lib/config/roles.js";
    import { toast } from "#lib/toast.js";
    import { num, str } from "#lib/utils.js";
    import { getCOCPlayer, type GetCOCPlayerStatus200 } from "@repo/clashofclans-client";
    import type { Component } from "svelte";
    import TablerActivity from "~icons/tabler/activity";
    import TablerBuildingBank from "~icons/tabler/building-bank";
    import TablerBuildingCastle from "~icons/tabler/building-castle";
    import TablerCheck from "~icons/tabler/check";
    import TablerCoins from "~icons/tabler/coins";
    import TablerCopy from "~icons/tabler/copy";
    import TablerDeviceGamepad2 from "~icons/tabler/device-gamepad-2";
    import TablerExternalLink from "~icons/tabler/external-link";
    import TablerGift from "~icons/tabler/gift";
    import TablerHeart from "~icons/tabler/heart";
    import TablerPick from "~icons/tabler/pick";
    import TablerShieldCheck from "~icons/tabler/shield-check";
    import TablerSparkles from "~icons/tabler/sparkles";
    import TablerStar from "~icons/tabler/star";
    import TablerSwords from "~icons/tabler/swords";
    import TablerTrophy from "~icons/tabler/trophy";
    import TablerWeight from "~icons/tabler/weight";
    import TablerWorld from "~icons/tabler/world";
    import TablerWorldX from "~icons/tabler/world-x";

    type CocAccount = {
        id: number;
        cocAccountTag: string;
        discordUserId: string;
        isExternal: boolean;
        warWeight: number;
        currentClan?: string | null;
        townHall?: number | null;
        totalDonated?: number | null;
        totalReceived?: number | null;
        clanGames?: number | null;
        capitalGoldLooted?: number | null;
        capitalGoldContributed?: number | null;
        activityScore?: number | null;
        ownerName: string | null;
        ownerImage: string | null;
        ownerRole: string | null;
    };

    let { account }: { account: CocAccount } = $props();

    const tabs = ["overview", "profile", "army"] as const;
    let activeTab = $state<(typeof tabs)[number]>("overview");
    let copied = $state(false);

    // Fetched once per account; switching tabs re-awaits the same resolved promise (no refetch).
    let playerRequest = $derived(getCOCPlayer({ path: { tag: account.cocAccountTag } }));

    // Resolved live player, used to backfill any CoC field the caller didn't pass.
    type PlayerData = GetCOCPlayerStatus200["data"]["player"];
    let player = $state<PlayerData | null>(null);
    let playerLoading = $state(false);
    $effect(() => {
        let active = true;
        player = null;
        playerLoading = true;
        playerRequest
            .then((res) => {
                if (active && res.data) player = res.data.data.player;
            })
            .catch(() => {})
            .finally(() => {
                if (active) playerLoading = false;
            });
        return () => {
            active = false;
        };
    });

    const townHall = $derived(num(account.townHall, player?.townHallLevel));
    const currentClan = $derived(str(account.currentClan, player?.clan?.name));
    const totalDonated = $derived(num(account.totalDonated, player?.donations));
    const totalReceived = $derived(num(account.totalReceived, player?.donationsReceived));
    const capitalContributed = $derived(num(account.capitalGoldContributed, player?.clanCapitalContributions));
    const hasSyncedStats = $derived(
        totalDonated != null ||
            totalReceived != null ||
            num(account.clanGames) != null ||
            num(account.capitalGoldLooted) != null ||
            capitalContributed != null,
    );

    const fmt = (n: number | null | undefined) => (n != null ? n.toLocaleString() : "—");

    async function copyTag() {
        try {
            await navigator.clipboard.writeText(account.cocAccountTag);
            copied = true;
            setTimeout(() => (copied = false), 1500);
        } catch {
            toast.error("Couldn't copy to clipboard");
        }
    }
</script>

{#snippet tile(icon: Component, label: string, value: string)}
    {@const Cmp = icon}
    <div class="flex flex-col gap-1 rounded-lg bg-stone-800 px-3 py-2">
        <div class="flex items-center gap-1 text-xs font-medium text-stone-400">
            <Cmp class="size-3.5 shrink-0" />
            <span class="truncate">{label}</span>
        </div>
        <span class="truncate font-mono text-sm font-medium text-stone-200">{value}</span>
    </div>
{/snippet}

{#snippet tileSkeleton(icon: Component, label: string)}
    {@const Cmp = icon}
    <div class="flex flex-col gap-1 rounded-lg bg-stone-800 px-3 py-2">
        <div class="flex items-center gap-1 text-xs font-medium text-stone-400">
            <Cmp class="size-3.5 shrink-0" />
            <span class="truncate">{label}</span>
        </div>
        <div class="flex h-5 items-center"><div class="h-3.5 w-16 skeleton"></div></div>
    </div>
{/snippet}

{#snippet sectionTitle(icon: Component, title: string)}
    {@const Cmp = icon}
    <div class="flex items-center gap-1.5 text-xs font-medium tracking-wide text-stone-400 uppercase">
        <Cmp class="size-4 shrink-0" />
        <span>{title}</span>
    </div>
{/snippet}

<!-- Placeholders for the Profile tab, built from the same pieces as the loaded sections. -->
{#snippet titleSkeleton()}
    <div class="flex h-4 items-center gap-1.5">
        <div class="size-4 skeleton rounded"></div>
        <div class="h-3 w-20 skeleton"></div>
    </div>
{/snippet}

{#snippet tilesSkeleton(count: number)}
    <div class="grid grid-cols-2 gap-2">
        {#each { length: count }, i (i)}
            <div class="flex flex-col gap-1 rounded-lg bg-stone-800 px-3 py-2">
                <div class="flex h-4 items-center"><div class="h-3 w-16 skeleton"></div></div>
                <div class="flex h-5 items-center"><div class="h-3.5 w-12 skeleton"></div></div>
            </div>
        {/each}
    </div>
{/snippet}

{#snippet rowSkeleton(badge: boolean)}
    <div class="flex items-center gap-3 rounded-lg bg-stone-800 px-3 py-2">
        <div class="size-10 shrink-0 skeleton rounded-lg"></div>
        <div class="flex min-w-0 flex-1 flex-col">
            <div class="flex h-5 items-center"><div class="h-3.5 w-24 skeleton"></div></div>
            <div class="flex h-4 items-center"><div class="h-3 w-16 skeleton"></div></div>
        </div>
        {#if badge}
            <div class="h-5.5 w-16 shrink-0 skeleton rounded-full"></div>
        {/if}
    </div>
{/snippet}

{#snippet profileSkeleton()}
    <div class="space-y-4" aria-busy="true">
        <div class="space-y-2">
            {@render titleSkeleton()}
            {@render rowSkeleton(true)}
            {@render tilesSkeleton(2)}
        </div>
        {#each [2, 3, 3, 2] as tiles, i (i)}
            <div class="space-y-2">
                {@render titleSkeleton()}
                {@render tilesSkeleton(tiles)}
            </div>
        {/each}
        <div class="space-y-2">
            {@render titleSkeleton()}
            {@render rowSkeleton(false)}
        </div>
    </div>
{/snippet}

{#snippet stateBox(icon: Component, text: string)}
    {@const Cmp = icon}
    <div class="flex items-center justify-center gap-2 rounded-2xl bg-stone-800 px-2 py-8 text-stone-400">
        <Cmp class="size-6 shrink-0" />
        <span>{text}</span>
    </div>
{/snippet}

<div class="flex size-full flex-col">
    <!-- Header -->
    <div>
        <div class="mb-4 flex items-center gap-4">
            {#if townHall}
                <Tooltip title="Town Hall {townHall}" placement="bottom">
                    <TownHall level={townHall} class="size-14 shrink-0" />
                </Tooltip>
            {:else if playerLoading}
                <div class="size-14 shrink-0 skeleton rounded-lg"></div>
            {/if}
            <div class="min-w-0 flex-1">
                <h3 class="truncate text-xl font-medium text-stone-50">
                    {#await playerRequest}
                        <span class="font-mono">{account.cocAccountTag}</span>
                    {:then res}
                        {res.data ? res.data.data.player.name : account.cocAccountTag}
                    {:catch}
                        <span class="font-mono">{account.cocAccountTag}</span>
                    {/await}
                </h3>
                <span class="flex items-center gap-1 truncate text-xs text-stone-400">
                    <span class="font-mono">{account.cocAccountTag}</span> · Town Hall
                    {#if townHall}
                        {townHall}
                    {:else if playerLoading}
                        <span class="inline-block h-3 w-6 skeleton"></span>
                    {:else}
                        —
                    {/if}
                </span>
            </div>
        </div>

        <div class="mb-4 flex flex-wrap gap-2">
            {#if account.isExternal}
                <Badge variant="red" content="External" icon={TablerWorld} class="rounded-lg" />
            {:else}
                <Badge variant="green" content="Main" icon={TablerShieldCheck} class="rounded-lg" />
            {/if}
            {#if currentClan}
                <Badge variant="blue" content={currentClan} icon={TablerBuildingCastle} class="rounded-lg" />
            {:else if playerLoading}
                <div class="h-8 w-24 skeleton rounded-lg"></div>
            {/if}
            <Button
                size="icon"
                variant={copied ? "success" : "base"}
                class="ml-auto"
                onclick={copyTag}
                tooltip={copied ? "Copied!" : "Copy tag"}
                tooltipPlacement="bottom"
            >
                {#if copied}<TablerCheck />{:else}<TablerCopy />{/if}
            </Button>
            <Button
                size="icon"
                variant="base"
                href={`https://link.clashofclans.com/en/?action=OpenPlayerProfile&tag=${encodeURIComponent(account.cocAccountTag)}`}
                target="_blank"
                tooltip="Open in game"
                tooltipPlacement="bottom"
            >
                <TablerExternalLink />
            </Button>
        </div>

        <Tabs label="Sections" options={tabs.map((key) => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1) }))} bind:value={activeTab} />
    </div>

    <div class="-mx-1 flex-1 scrollbar-none overflow-y-auto px-1 py-4 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {#if activeTab === "overview"}
            <div class="space-y-4">
                <!-- Owner -->
                <div class="space-y-2">
                    {@render sectionTitle(TablerHeart, "Owner")}
                    <div class="flex items-center gap-3 rounded-lg bg-stone-800 px-3 py-2">
                        <Avatar
                            src={account.ownerImage}
                            name={account.ownerName || "Unknown"}
                            role={(account.ownerRole as Role) || "unverified"}
                            size="sm"
                        />
                        <div class="flex min-w-0 flex-col">
                            <span class="truncate text-sm font-medium text-stone-200">{account.ownerName || "Unknown"}</span>
                            <span class="truncate font-mono text-xs text-stone-400">{account.discordUserId}</span>
                        </div>
                        {#if account.ownerRole}
                            <div class="ml-auto shrink-0">
                                <RoleBadge role={account.ownerRole as Role} />
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Management -->
                <div class="space-y-2">
                    {@render sectionTitle(TablerWeight, "Management")}
                    <div class="grid grid-cols-2 gap-2">
                        {@render tile(TablerWeight, "War weight", account.warWeight ? fmt(account.warWeight) : "Not set")}
                        {#if account.activityScore != null}
                            {@render tile(TablerActivity, "Activity score", fmt(account.activityScore))}
                        {/if}
                    </div>
                </div>

                {#if hasSyncedStats || playerLoading}
                    <div class="space-y-2">
                        {@render sectionTitle(TablerStar, "Synced stats")}
                        <div class="grid grid-cols-2 gap-2">
                            {#if playerLoading}
                                {@render tileSkeleton(TablerGift, "Total donated")}
                            {:else}
                                {@render tile(TablerGift, "Total donated", fmt(totalDonated))}
                            {/if}
                            {#if playerLoading}
                                {@render tileSkeleton(TablerGift, "Total received")}
                            {:else}
                                {@render tile(TablerGift, "Total received", fmt(totalReceived))}
                            {/if}
                            {@render tile(TablerDeviceGamepad2, "Clan games", fmt(account.clanGames))}
                            {@render tile(TablerPick, "Capital looted", fmt(account.capitalGoldLooted))}
                            {#if playerLoading}
                                {@render tileSkeleton(TablerBuildingBank, "Capital contributed")}
                            {:else}
                                {@render tile(TablerBuildingBank, "Capital contributed", fmt(capitalContributed))}
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        {:else if activeTab === "profile"}
            {#await playerRequest}
                {@render profileSkeleton()}
            {:then res}
                {#if res.data}
                    {@const player = res.data.data.player}
                    <div class="space-y-4">
                        <!-- Profile -->
                        <div class="space-y-2">
                            {@render sectionTitle(TablerStar, "Profile")}
                            <div class="flex items-center gap-3 rounded-lg bg-stone-800 px-3 py-2">
                                {#if player.leagueTier}
                                    <div
                                        class="size-10 shrink-0 bg-contain bg-center bg-no-repeat"
                                        style="background-image: url({player.leagueTier.iconUrls.small})"
                                    ></div>
                                {/if}
                                <div class="min-w-0 flex-1">
                                    <span class="block truncate text-sm font-medium text-stone-50">{player.name}</span>
                                    <span class="block truncate text-xs text-stone-400">{player.leagueTier?.name ?? "Unranked"}</span>
                                </div>
                                {#if player.warPreference}
                                    <Badge
                                        variant={player.warPreference === "in" ? "green" : "ghost"}
                                        content={player.warPreference === "in" ? "War in" : "War out"}
                                        icon={TablerSwords}
                                    />
                                {/if}
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                {@render tile(
                                    TablerBuildingCastle,
                                    "Town Hall",
                                    String(player.townHallLevel) + (player.townHallWeaponLevel ? ` (w${player.townHallWeaponLevel})` : ""),
                                )}
                                {@render tile(TablerStar, "Experience", fmt(player.expLevel))}
                            </div>
                        </div>

                        <!-- Trophies -->
                        <div class="space-y-2">
                            {@render sectionTitle(TablerTrophy, "Trophies")}
                            <div class="grid grid-cols-2 gap-2">
                                {@render tile(TablerTrophy, "Trophies", fmt(player.trophies))}
                                {@render tile(TablerTrophy, "Best", fmt(player.bestTrophies))}
                                {#if player.legendStatistics?.legendTrophies}
                                    {@render tile(TablerSparkles, "Legend trophies", fmt(player.legendStatistics.legendTrophies))}
                                {/if}
                            </div>
                        </div>

                        <!-- Combat -->
                        <div class="space-y-2">
                            {@render sectionTitle(TablerSwords, "Combat")}
                            <div class="grid grid-cols-2 gap-2">
                                {@render tile(TablerStar, "War stars", fmt(player.warStars))}
                                {@render tile(TablerSwords, "Attack wins", fmt(player.attackWins))}
                                {@render tile(TablerShieldCheck, "Defense wins", fmt(player.defenseWins))}
                            </div>
                        </div>

                        <!-- Donations & capital -->
                        <div class="space-y-2">
                            {@render sectionTitle(TablerGift, "Donations & capital")}
                            <div class="grid grid-cols-2 gap-2">
                                {@render tile(TablerGift, "Donated", fmt(player.donations))}
                                {@render tile(TablerGift, "Received", fmt(player.donationsReceived))}
                                {@render tile(TablerCoins, "Capital", fmt(player.clanCapitalContributions))}
                            </div>
                        </div>

                        {#if player.builderHallLevel}
                            <div class="space-y-2">
                                {@render sectionTitle(TablerBuildingCastle, "Builder base")}
                                <div class="grid grid-cols-2 gap-2">
                                    {@render tile(TablerBuildingCastle, "Builder Hall", fmt(player.builderHallLevel))}
                                    {#if player.builderBaseTrophies != null}
                                        {@render tile(TablerTrophy, "Builder trophies", fmt(player.builderBaseTrophies))}
                                    {/if}
                                </div>
                            </div>
                        {/if}

                        {#if player.clan}
                            <div class="space-y-2">
                                {@render sectionTitle(TablerBuildingCastle, "Clan")}
                                <div class="flex items-center gap-3 rounded-lg bg-stone-800 px-3 py-2">
                                    <div
                                        class="size-10 shrink-0 bg-contain bg-center bg-no-repeat"
                                        style="background-image: url({player.clan.badgeUrls.medium})"
                                    ></div>
                                    <div class="flex min-w-0 flex-col">
                                        <span class="truncate text-sm font-medium text-stone-200">{player.clan.name}</span>
                                        <span class="truncate font-mono text-xs text-stone-400">{player.clan.tag} · Lvl {player.clan.clanLevel}</span>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                {:else}
                    {@render stateBox(TablerWorldX, "Couldn't load live data")}
                {/if}
            {:catch}
                {@render stateBox(TablerWorldX, "Couldn't load live data")}
            {/await}
        {:else if activeTab === "army"}
            {#await playerRequest}
                <div class="space-y-2" aria-busy="true">
                    {@render titleSkeleton()}
                    {#each { length: 6 }, i (i)}
                        <div class="space-y-2 rounded-lg bg-stone-800 px-3 py-2">
                            <div class="flex h-5.5 items-center justify-between gap-3">
                                <div class="h-3.5 w-28 skeleton"></div>
                                <div class="h-5.5 w-16 skeleton rounded-full"></div>
                            </div>
                            <div class="flex gap-1">
                                <div class="h-5.5 w-32 skeleton rounded-full"></div>
                                <div class="h-5.5 w-36 skeleton rounded-full"></div>
                            </div>
                        </div>
                    {/each}
                </div>
            {:then res}
                {#if res.data && res.data.data.player.heroes?.filter((h) => h.village === "home").length}
                    {@const heroes = res.data.data.player.heroes.filter((h) => h.village === "home")}
                    <div class="space-y-2">
                        {@render sectionTitle(TablerSparkles, "Heroes")}
                        {#each heroes as hero (hero.name)}
                            <div class="space-y-2 rounded-lg bg-stone-800 px-3 py-2">
                                <div class="flex items-center justify-between gap-3">
                                    <span class="truncate text-sm font-medium text-stone-200">{hero.name}</span>
                                    <Badge variant={hero.level === hero.maxLevel ? "green" : "ghost"} content="{hero.level} / {hero.maxLevel}" />
                                </div>
                                {#if hero.equipment?.length}
                                    <div class="flex flex-wrap gap-1">
                                        {#each hero.equipment as eq (eq.name)}
                                            <Badge variant="ghost" content="{eq.name} · {eq.level}/{eq.maxLevel}" />
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else if res.data}
                    {@render stateBox(TablerSwords, "No heroes yet")}
                {:else}
                    {@render stateBox(TablerWorldX, "Couldn't load live data")}
                {/if}
            {:catch}
                {@render stateBox(TablerWorldX, "Couldn't load live data")}
            {/await}
        {/if}
    </div>
</div>
