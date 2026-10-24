<script lang="ts" module>
    import type { GetCOCClanCurrentWar200 } from "@repo/clashofclans-client";

    export type War = GetCOCClanCurrentWar200["data"]["currentWar"];
    export type WarEntry = { tag: string; name: string; badge: string; war: War | null };

    // Supercell sends compact ISO 8601 (20240321T060136.000Z), which Date can't parse as-is.
    export const parseCoCDate = (s: string) =>
        new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}.000Z`).getTime();
</script>

<script lang="ts">
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocMeter from "$lib/components/ui/coc/CocMeter.svelte";
    import CocPopup from "$lib/components/ui/coc/CocPopup.svelte";
    import Icon from "$lib/components/ui/Icon.svelte";
    import TownHall from "$lib/components/ui/TownHall.svelte";
    import { cn } from "$lib/utils";
    import FwaPointsPanel from "./FwaPointsPanel.svelte";
    import { warLogHref } from "./war-log/warLog";

    let { entry, now, class: className = "" }: { entry: WarEntry; now: number; class?: string } = $props();

    const war = $derived(entry.war);
    const warState = $derived(war?.state ?? "notInWar");
    const active = $derived(warState === "inWar" || warState === "preparation");
    const totalAttacks = $derived((war?.teamSize ?? 0) * (war?.attacksPerMember ?? 0));

    const status = {
        inWar: { label: "Battle day", chip: "from-[#f2604a] to-[#a51f14]" },
        preparation: { label: "Preparation", chip: "from-[#ffcd6a] to-[#d97a1e]" },
        warEnded: { label: "War ended", chip: "from-[#a8a29e] to-[#57534e]" },
        notInWar: { label: "Not in war", chip: "from-[#a8a29e] to-[#57534e]" },
    } as const;

    const countdown = $derived.by(() => {
        if (!war || !active) return "";
        const diff = parseCoCDate(warState === "preparation" ? war.startTime : war.endTime) - now;
        if (diff <= 0) return "any second";
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        const s = Math.floor((diff % 60_000) / 1000);
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${h}h ${pad(m)}m ${pad(s)}s`;
    });

    const lineup = $derived.by(() => {
        const counts: Record<number, number> = {};
        for (const m of war?.clan?.members ?? []) counts[m.townhallLevel] = (counts[m.townhallLevel] ?? 0) + 1;
        return Object.entries(counts)
            .map(([th, n]) => [Number(th), n] as const)
            .sort(([a], [b]) => b - a)
            .slice(0, 4);
    });

    const result = $derived.by(() => {
        if (warState !== "warEnded" || !war) return null;
        const us = war.clan.stars * 1000 + war.clan.destructionPercentage;
        const them = war.opponent.stars * 1000 + war.opponent.destructionPercentage;
        return us > them ? "Victory" : us < them ? "Defeat" : "Draw";
    });

    const encodedTag = $derived(encodeURIComponent(entry.tag));
    let pointsOpen = $state(false);
    // Mount on first open and keep it, so the content fades out with the popup instead of vanishing first.
    let pointsMounted = $state(false);
    $effect(() => {
        if (pointsOpen) pointsMounted = true;
    });
</script>

{#snippet side(name: string, badge: string, level: number | undefined)}
    <div class="flex min-w-0 flex-col items-center gap-1 rounded-xl p-2 text-center coc-slot">
        {#if badge}
            <img src={badge} alt="" class="size-14 object-contain drop-shadow-[0_3px_3px_rgba(0,0,0,0.6)] md:size-16" />
        {:else}
            <div class="size-14 rounded-full bg-black/25 md:size-16"></div>
        {/if}
        <span class="w-full truncate font-coc text-sm font-bold text-white text-outline md:text-base">{name}</span>
        {#if level}
            <span class="font-coc text-[0.65rem] text-parchment/70">Level {level}</span>
        {/if}
    </div>
{/snippet}

<article class={cn("relative flex flex-col gap-3 rounded-2xl p-3 coc-plank transition-[filter] duration-200 hover:brightness-105 md:p-4", className)}>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <span
            class={cn(
                "rounded-md border border-black bg-linear-to-b px-2.5 py-0.5 font-coc text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] text-outline",
                status[warState].chip,
            )}
        >
            {status[warState].label}
        </span>
        {#if active}
            <span class="flex items-center gap-1.5 font-coc text-sm font-bold text-white text-outline">
                <Icon name="clock" class="size-5" />
                <span class="text-parchment/80 [text-shadow:none]">{warState === "preparation" ? "Starts in" : "Ends in"}</span>
                <span class="tabular-nums">{countdown}</span>
            </span>
        {:else if result}
            <span
                class={cn(
                    "font-coc text-sm font-bold text-outline",
                    result === "Victory" ? "text-[#b9f07a]" : result === "Defeat" ? "text-[#ff8a75]" : "text-white",
                )}
            >
                {result}
            </span>
        {/if}
    </div>

    {#if war && warState !== "notInWar"}
        <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-3">
            {@render side(war.clan.name, war.clan.badgeUrls.large, war.clan.clanLevel)}
            <div class="flex flex-col items-center gap-1 px-1">
                <div class="flex items-center gap-1.5">
                    <span class="font-coc text-3xl font-black text-white tabular-nums text-outline md:text-4xl">{war.clan.stars}</span>
                    <Icon name="star" class="size-7 md:size-8" />
                    <span class="font-coc text-3xl font-black text-white tabular-nums text-outline md:text-4xl">{war.opponent.stars}</span>
                </div>
                <span class="font-coc text-xs font-bold tracking-[0.2em] text-parchment/70 uppercase">{war.teamSize} vs {war.teamSize}</span>
            </div>
            {@render side(war.opponent.name, war.opponent.badgeUrls.large, war.opponent.clanLevel)}
        </div>

        <div class="grid grid-cols-2 gap-2">
            <CocMeter
                label="{war.clan.name} destruction"
                value={war.clan.destructionPercentage}
                max={100}
                text="{war.clan.destructionPercentage.toFixed(1)}%"
            />
            <CocMeter
                label="{war.opponent.name} destruction"
                value={war.opponent.destructionPercentage}
                max={100}
                tone="red"
                text="{war.opponent.destructionPercentage.toFixed(1)}%"
            />
        </div>

        {#if warState === "inWar" && totalAttacks > 0}
            <CocMeter
                label="Attacks used"
                value={war.clan.attacks}
                max={totalAttacks}
                tone="orange"
                text="{war.clan.attacks}/{totalAttacks} attacks · {totalAttacks - war.clan.attacks} left"
            />
        {/if}

        {#if lineup.length}
            <div class="flex flex-wrap gap-1.5">
                {#each lineup as [th, count] (th)}
                    <span class="flex items-center gap-1.5 rounded-lg py-1 pr-2.5 pl-1.5 coc-slot" title="{count} at town hall {th}">
                        <TownHall level={th} class="size-6" />
                        <span class="font-coc text-sm font-bold text-white text-outline">TH{th}</span>
                        <span class="font-coc text-xs text-parchment/80">×{count}</span>
                    </span>
                {/each}
            </div>
        {/if}
    {:else}
        <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <div class="w-24 md:w-28">{@render side(entry.name, entry.badge, undefined)}</div>
            <p class="font-coc text-sm text-parchment/85">Not in a war right now. Check back once the next search starts.</p>
        </div>
    {/if}

    <div class="mt-auto grid grid-cols-3 gap-2">
        <CocBtn
            variant="orange"
            size="sm"
            class="w-full"
            href="https://link.clashofclans.com/?action=OpenClanProfile&tag={encodedTag}"
            target="_blank"
        >
            Clan
        </CocBtn>
        <CocBtn variant="green" size="sm" class="w-full" href={warLogHref(entry.tag)}>War Log</CocBtn>
        <CocPopup
            title="War Points"
            placement="right"
            maxWidth="w-[min(26rem,calc(var(--available-width)-1rem))]"
            class="w-full"
            bind:open={pointsOpen}
        >
            {#snippet trigger()}
                <CocBtn variant="red" size="sm" class="w-full">Points</CocBtn>
            {/snippet}
            {#if pointsMounted}
                <FwaPointsPanel tag={entry.tag} />
            {/if}
        </CocPopup>
    </div>
</article>
