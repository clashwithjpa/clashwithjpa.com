<script lang="ts">
    import Card from "$lib/components/app/Card.svelte";
    import H1 from "$lib/components/app/H1.svelte";
    import InlineLink from "$lib/components/app/InlineLink.svelte";
    import P from "$lib/components/app/P.svelte";
    import type { PageData } from "./$types";
    import type { APIClanWar } from "$lib/coc/types";
    import { Button } from "$lib/components/ui/button";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

    let { data }: { data: PageData } = $props();

    const cardGradient: string = "from-red-900 via-red-900 via-10% to-red-950 inset-shadow-rose-800";

    function parseCocDate(s: string) {
        if (!s) return new Date();
        const m = s.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z/);
        if (m) {
            return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7]}Z`);
        }
        return new Date(s);
    }

    function getCountdown(targetISO?: string, _tick?: number) {
        if (!targetISO) return "";
        const target = parseCocDate(targetISO).getTime();
        const now = Date.now();
        let diff = Math.max(0, Math.floor((target - now) / 1000));
        const days = Math.floor(diff / 86400);
        diff %= 86400;
        const hours = Math.floor(diff / 3600);
        diff %= 3600;
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        return `${days}D ${hours}H ${mins}M ${secs}S`;
    }

    let tick = $state(0);
    const interval = setInterval(() => (tick = tick + 1), 1000);
    $effect(() => () => clearInterval(interval));

    function buildTHHistogram(members: { townhallLevel: number }[]) {
        const counts = members.reduce<Record<number, number>>((acc, m) => {
            acc[m.townhallLevel] = (acc[m.townhallLevel] ?? 0) + 1;
            return acc;
        }, {});
        const levels = Object.keys(counts)
            .map((n) => Number(n))
            .sort((a, b) => b - a);
        return { counts, levels } as const;
    }

    function getSideStats(side: "clan" | "opponent", war?: APIClanWar) {
        if (!war) {
            return { th: { counts: {}, levels: [] as number[] }, attacksUsed: 0, attacksAvailable: 0, attacksLeft: 0, stars: 0 } as const;
        }
        const s = (war as any)?.[side] as APIClanWar[typeof side] | undefined;
        const members = Array.isArray((s as any)?.members) ? ((s as any).members as { townhallLevel: number; attacks?: unknown[] }[]) : [];
        const th = buildTHHistogram(members as { townhallLevel: number }[]);
        const attacksUsed = typeof (s as any)?.attacks === "number" ? ((s as any).attacks as number) : members.reduce((a, m) => a + ((m.attacks as unknown[] | undefined)?.length ?? 0), 0);
        const observedMaxPerMember = members.reduce((max, m) => Math.max(max, ((m.attacks as unknown[] | undefined)?.length ?? 0)), 0);
        const perMember = typeof war.attacksPerMember === "number" && war.attacksPerMember > 0 ? war.attacksPerMember : observedMaxPerMember > 0 ? observedMaxPerMember : 2;
        const teamSize = typeof war.teamSize === "number" && war.teamSize > 0 ? war.teamSize : members.length;
        const attacksAvailable = teamSize * perMember;
        const attacksLeft = Math.max(0, attacksAvailable - attacksUsed);
        const stars = typeof (s as any)?.stars === "number" ? ((s as any).stars as number) : 0;
        return { th, attacksUsed, attacksAvailable, attacksLeft, stars } as const;
    }
</script>

<svelte:head>
    <title>JPA | Wars</title>
    <meta name="description" content="Latest war status for all JPA clans with live countdown." />
    <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex size-full flex-col">
    <header class="top-0 w-full">
        <div class="z-10 h-full w-full overflow-hidden bg-cover bg-fixed bg-center" style="background-image: url('/clans_header.webp');">
            <div class="bg-background/40 flex h-full items-center">
                <div class="mt-32 flex grow flex-col items-start space-y-10 px-5 pb-5 md:px-24 lg:px-32">
                    <H1 class="text-5xl lg:text-6xl">JPA Wars</H1>
                    <p class="max-w-2xl text-lg font-medium md:text-xl">
                        Live status of the latest wars across our clans. Refresh to get the newest updates.
                    </p>
                    <InlineLink href="/clans" class="mt-4 text-xl" arrow={true}>
                        <span>View Clans</span>
                    </InlineLink>
                </div>
            </div>
        </div>
    </header>

    <div class="flex w-full flex-col items-center justify-center p-11">
        <div class="flex w-full flex-col items-center">
            <div class="flex w-full flex-wrap items-stretch justify-center gap-5 lg:gap-11">
                {#each data.wars as item}
                        <Card class="border-background relative size-full items-stretch rounded-xl border-2 bg-linear-to-b {cardGradient} shadow-background shadow-[0_0_5px_0.5px_var(--tw-shadow-color)] inset-shadow-sm">
                            <img src="/cards_bg.webp" alt="Card Background" class="absolute inset-0 -z-10 size-full rounded-xl object-cover opacity-10" />
                            <div class="flex flex-col justify-between">
                                <div class="flex w-80 items-center space-x-4 p-4">
                                    <img class="size-20" src={item.clan.clanData?.badgeUrls.medium} alt={item.clan.clanData?.name} loading="lazy" decoding="async" fetchpriority="low" />
                                    <div class="flex size-full flex-col items-start">
                                        <P class="text-2xl">{item.clan.clanData?.name}</P>
                                        <p class="text-sm">{item.clan.clanData?.tag}</p>
                                        <p class="text-sm">LVL. {item.clan.clanData?.clanLevel}</p>
                                    </div>
                                </div>

                                <div class="border-background bg-foreground/10 inset-shadow-foreground mx-2 flex flex-col rounded-xl border-1 p-4 inset-shadow-sm">
                    {#if item.war}
                                        {#if (item.war as APIClanWar).state === 'preparation'}
                                            <p class="font-semibold">State: Preparation</p>
                        <p>Team Size: {(item.war as APIClanWar).teamSize}v{(item.war as APIClanWar).teamSize}</p>
                        <p>Starts In: {getCountdown((item.war as APIClanWar).startTime, tick)}</p>
                                        {:else if (item.war as APIClanWar).state === 'inWar'}
                                            <p class="font-semibold">State: In War</p>
                                            <p>
                                                Score: {(item.war as APIClanWar).clan.stars} ⭐ vs {(item.war as APIClanWar).opponent.stars} ⭐
                                            </p>
                        <p>Ends In: {getCountdown((item.war as APIClanWar).endTime, tick)}</p>
                                        {:else if (item.war as APIClanWar).state === 'warEnded'}
                                            <p class="font-semibold">State: Ended</p>
                                            <p>
                                                Final: {(item.war as APIClanWar).clan.stars} ⭐ vs {(item.war as APIClanWar).opponent.stars} ⭐
                                            </p>
                                        {:else}
                                            <p class="font-semibold">Not In War</p>
                                        {/if}
                                    {:else}
                                        <p class="font-semibold">War info unavailable</p>
                                    {/if}
                                </div>

                                {#if item.war && ((item.war as APIClanWar).state === 'preparation' || (item.war as APIClanWar).state === 'inWar' || (item.war as APIClanWar).state === 'warEnded')}
                                    <div class="mx-2 mb-2 flex flex-col">
                                        <p class="p-4 text-center">Opponent</p>
                                        <div class="border-background bg-foreground/10 inset-shadow-foreground flex w-full items-center space-x-3 rounded-xl border-1 p-4 inset-shadow-sm">
                                            <img class="size-11" src={(item.war as APIClanWar).opponent.badgeUrls.medium} alt={(item.war as APIClanWar).opponent.name} loading="lazy" decoding="async" fetchpriority="low" />
                                            <div class="flex flex-col">
                                                <p class="text-sm">{(item.war as APIClanWar).opponent.name}</p>
                                                <p class="text-xs opacity-80">{(item.war as APIClanWar).opponent.tag}</p>
                                            </div>
                                        </div>
                                    </div>
                                {/if}

                                {#if item.war}
                                    <div class="mx-2 mb-3 flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            href={`https://points.fwafarm.com/clan?tag=${encodeURIComponent(item.clan.clanData?.tag || item.clan.clanTag)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="inset-shadow-foreground border-background rounded-lg border-1 inset-shadow-sm"
                                        >
                                            Point system
                                        </Button>
                                        <DropdownMenu.Root>
                                            <DropdownMenu.Trigger>
                                                {#snippet child({ props })}
                                                    <Button {...props} variant="secondary" class="inset-shadow-foreground border-background rounded-lg border-1 inset-shadow-sm">
                                                        Show details
                                                    </Button>
                                                {/snippet}
                                            </DropdownMenu.Trigger>
                                            <DropdownMenu.Content class="w-96 md:w-[34rem] overflow-hidden rounded-xl border-1 border-background/50 bg-background/95 p-0 shadow-xl backdrop-blur">
                                                <DropdownMenu.Label class="bg-foreground/5 px-4 py-3 text-sm font-semibold">War details</DropdownMenu.Label>
                                                <DropdownMenu.Separator />
                                                {@const our = getSideStats('clan', item.war as APIClanWar)}
                                                {@const opp = getSideStats('opponent', item.war as APIClanWar)}
                                                <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                                                    <div class="border-background/60 bg-foreground/5 rounded-lg border p-3">
                                                        <p class="text-xs uppercase tracking-wide opacity-70">{(item.war as APIClanWar).clan.name}</p>
                                                        <div class="mt-2 space-y-3 text-sm">
                                                            <div>
                                                                <p class="text-xs uppercase tracking-wide opacity-70">Town Halls</p>
                                                                <div class="mt-2 flex flex-wrap gap-2">
                                                                    {#each our.th.levels as lvl}
                                                                        <span class="rounded-md bg-background/60 px-2 py-1">TH{lvl}: <span class="font-semibold">{our.th.counts[lvl]}</span></span>
                                                                    {/each}
                                                                </div>
                                                            </div>
                                                            <div class="grid grid-cols-2 gap-2">
                                                                <div class="flex items-center justify-between rounded-md bg-background/60 px-3 py-1.5"><span>Attacks</span><span class="font-semibold">{our.attacksUsed}/{our.attacksAvailable}</span></div>
                                                                <div class="flex items-center justify-between rounded-md bg-background/60 px-3 py-1.5"><span>Left</span><span class="font-semibold">{our.attacksLeft}</span></div>
                                                            </div>
                                                            <div class="flex items-center justify-between rounded-md bg-background/60 px-3 py-1.5"><span>Stars</span><span class="font-semibold">{our.stars} ⭐</span></div>
                                                        </div>
                                                    </div>

                                                    <div class="border-background/60 bg-foreground/5 rounded-lg border p-3">
                                                        <p class="text-xs uppercase tracking-wide opacity-70">{(item.war as APIClanWar).opponent.name}</p>
                                                        <div class="mt-2 space-y-3 text-sm">
                                                            <div>
                                                                <p class="text-xs uppercase tracking-wide opacity-70">Town Halls</p>
                                                                <div class="mt-2 flex flex-wrap gap-2">
                                                                    {#each opp.th.levels as lvl}
                                                                        <span class="rounded-md bg-background/60 px-2 py-1">TH{lvl}: <span class="font-semibold">{opp.th.counts[lvl]}</span></span>
                                                                    {/each}
                                                                </div>
                                                            </div>
                                                            <div class="grid grid-cols-2 gap-2">
                                                                <div class="flex items-center justify-between rounded-md bg-background/60 px-3 py-1.5"><span>Attacks</span><span class="font-semibold">{opp.attacksUsed}/{opp.attacksAvailable}</span></div>
                                                                <div class="flex items-center justify-between rounded-md bg-background/60 px-3 py-1.5"><span>Left</span><span class="font-semibold">{opp.attacksLeft}</span></div>
                                                            </div>
                                                            <div class="flex items-center justify-between rounded-md bg-background/60 px-3 py-1.5"><span>Stars</span><span class="font-semibold">{opp.stars} ⭐</span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Root>
                                    </div>
                                {/if}
                            </div>
                        </Card>
                {/each}
            </div>
        </div>
    </div>
</div>
