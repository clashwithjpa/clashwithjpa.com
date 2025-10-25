<script lang="ts">
    import type { APIClanWar } from "$lib/coc/types";
    import Card from "$lib/components/app/Card.svelte";
    import CocButton from "$lib/components/app/CocButton.svelte";
    import H1 from "$lib/components/app/H1.svelte";
    import InlineLink from "$lib/components/app/InlineLink.svelte";
    import P from "$lib/components/app/P.svelte";
    import PopupDialog from "$lib/components/app/PopupDialog.svelte";
    import * as Tabs from "$lib/components/ui/tabs";
    import MaterialSymbolsShieldOutline from "~icons/material-symbols/shield-outline";
    import MaterialSymbolsStarRounded from "~icons/material-symbols/star-rounded";
    import MaterialSymbolsSwordsCrossed from "~icons/material-symbols/swords";
    import MaterialSymbolsTimerOutline from "~icons/material-symbols/timer-outline";
    import type { PageData } from "./$types";

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
        if (!targetISO) return null;
        const target = parseCocDate(targetISO).getTime();
        const now = Date.now();
        let diff = Math.max(0, Math.floor((target - now) / 1000));
        const days = Math.floor(diff / 86400);
        diff %= 86400;
        const hours = Math.floor(diff / 3600);
        diff %= 3600;
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        return { days, hours, mins, secs };
    }

    function formatCountdown(cd: { days: number; hours: number; mins: number; secs: number } | null) {
        if (!cd) return "";
        if (cd.days > 0) return `${cd.days}d ${cd.hours}h ${cd.mins}m`;
        if (cd.hours > 0) return `${cd.hours}h ${cd.mins}m ${cd.secs}s`;
        return `${cd.mins}m ${cd.secs}s`;
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
            return {
                th: { counts: {}, levels: [] as number[] },
                attacksUsed: 0,
                attacksAvailable: 0,
                attacksLeft: 0,
                stars: 0,
                destruction: 0
            } as const;
        }
        const s = (war as any)?.[side] as APIClanWar[typeof side] | undefined;
        const members = Array.isArray((s as any)?.members) ? ((s as any).members as { townhallLevel: number; attacks?: unknown[] }[]) : [];
        const th = buildTHHistogram(members as { townhallLevel: number }[]);
        const attacksUsed =
            typeof (s as any)?.attacks === "number"
                ? ((s as any).attacks as number)
                : members.reduce((a, m) => a + ((m.attacks as unknown[] | undefined)?.length ?? 0), 0);
        const observedMaxPerMember = members.reduce((max, m) => Math.max(max, (m.attacks as unknown[] | undefined)?.length ?? 0), 0);
        const perMember =
            typeof war.attacksPerMember === "number" && war.attacksPerMember > 0
                ? war.attacksPerMember
                : observedMaxPerMember > 0
                  ? observedMaxPerMember
                  : 2;
        const teamSize = typeof war.teamSize === "number" && war.teamSize > 0 ? war.teamSize : members.length;
        const attacksAvailable = teamSize * perMember;
        const attacksLeft = Math.max(0, attacksAvailable - attacksUsed);
        const stars = typeof (s as any)?.stars === "number" ? ((s as any).stars as number) : 0;
        const destruction = typeof (s as any)?.destructionPercentage === "number" ? ((s as any).destructionPercentage as number) : 0;
        return { th, attacksUsed, attacksAvailable, attacksLeft, stars, destruction } as const;
    }

    function getWarStatus(war?: APIClanWar | null) {
        if (!war) return { label: "Not In War", color: "text-gray-400", bgColor: "bg-gray-600/20" };
        const state = (war as APIClanWar).state;
        if (state === "preparation") return { label: "Preparation", color: "text-yellow-400", bgColor: "bg-yellow-600/20" };
        if (state === "inWar") return { label: "Battle Day", color: "text-orange-400", bgColor: "bg-orange-600/20" };
        if (state === "warEnded") return { label: "War Ended", color: "text-gray-400", bgColor: "bg-gray-600/20" };
        return { label: "Not In War", color: "text-gray-400", bgColor: "bg-gray-600/20" };
    }

    // Filter wars by status
    let activeTab = $state<"all" | "active" | "preparation" | "ended">("all");

    const filteredWars = $derived(() => {
        if (activeTab === "all") return data.wars;
        if (activeTab === "active") {
            return data.wars.filter((w) => w.war && (w.war as APIClanWar).state === "inWar");
        }
        if (activeTab === "preparation") {
            return data.wars.filter((w) => w.war && (w.war as APIClanWar).state === "preparation");
        }
        if (activeTab === "ended") {
            return data.wars.filter((w) => w.war && (w.war as APIClanWar).state === "warEnded");
        }
        return data.wars;
    });

    let selectedWar = $state<(typeof data.wars)[number] | null>(null);
    let dialogOpen = $state(false);

    $effect(() => {
        if (!dialogOpen) {
            selectedWar = null;
        }
    });
</script>

<svelte:head>
    <title>JPA | Wars</title>
    <meta name="description" content="Live war status for all JPA clans with real-time countdowns." />
    <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="flex size-full flex-col">
    <header class="top-0 w-full">
        <div class="z-10 h-full w-full overflow-hidden bg-cover bg-fixed bg-center" style="background-image: url('/clans_header.webp');">
            <div class="bg-background/40 flex h-full items-center">
                <div class="mt-32 flex grow flex-col items-start space-y-10 px-5 pb-5 md:px-24 lg:px-32">
                    <H1 class="text-5xl lg:text-6xl">War Details</H1>
                    <p class="max-w-3xl text-lg leading-relaxed font-medium md:text-xl">
                        Track all active wars across {data.wars.length} JPA clans in real-time. Monitor battle progress, countdowns, and statistics.
                    </p>
                    <div class="flex gap-4">
                        <InlineLink href="/clans" class="text-xl" arrow={true}>
                            <span>View Clans</span>
                        </InlineLink>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <div class="flex w-full flex-col items-center justify-center space-y-20 p-6 md:space-y-8 md:px-11">
        <!-- Filter Tabs -->
        <Tabs.Root bind:value={activeTab} class="w-full">
            <Tabs.List
                class="border-background bg-background/40 grid w-full grid-cols-2 gap-2 rounded-xl border-2 p-2 backdrop-blur-sm md:grid-cols-4"
            >
                <Tabs.Trigger
                    value="all"
                    class="data-[state=active]:text-foreground rounded-lg px-4 py-2 text-sm font-semibold transition-all data-[state=active]:bg-red-600/30"
                >
                    All Wars ({data.wars.length})
                </Tabs.Trigger>
                <Tabs.Trigger
                    value="active"
                    class="data-[state=active]:text-foreground rounded-lg px-4 py-2 text-sm font-semibold transition-all data-[state=active]:bg-orange-600/30"
                >
                    Battle Day ({data.wars.filter((w) => w.war && (w.war as APIClanWar).state === "inWar").length})
                </Tabs.Trigger>
                <Tabs.Trigger
                    value="preparation"
                    class="data-[state=active]:text-foreground rounded-lg px-4 py-2 text-sm font-semibold transition-all data-[state=active]:bg-yellow-600/30"
                >
                    Prep ({data.wars.filter((w) => w.war && (w.war as APIClanWar).state === "preparation").length})
                </Tabs.Trigger>
                <Tabs.Trigger
                    value="ended"
                    class="data-[state=active]:text-foreground rounded-lg px-4 py-2 text-sm font-semibold transition-all data-[state=active]:bg-gray-600/30"
                >
                    Ended ({data.wars.filter((w) => w.war && (w.war as APIClanWar).state === "warEnded").length})
                </Tabs.Trigger>
            </Tabs.List>
        </Tabs.Root>

        <!-- Wars Grid -->
        <div class="grid w-full max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {#each filteredWars() as item, idx (item.clan.clanTag)}
                {@const war = item.war as APIClanWar | null}
                {@const status = getWarStatus(war)}
                {@const ourStats = getSideStats("clan", war ?? undefined)}
                {@const oppStats = getSideStats("opponent", war ?? undefined)}

                <Card
                    class="border-background relative w-full overflow-hidden rounded-2xl border-2 bg-linear-to-b {cardGradient} shadow-background shadow-[0_0_8px_1px_var(--tw-shadow-color)] inset-shadow-sm transition-all hover:shadow-[0_0_12px_2px_var(--tw-shadow-color)]"
                >
                    <!-- Glossy Overlay -->
                    <div
                        class="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-30"
                        style="mask-image: linear-gradient(135deg, white 0%, transparent 60%);"
                    ></div>

                    <img
                        src="/cards_bg.webp"
                        alt="Card Background"
                        class="absolute inset-0 -z-10 size-full rounded-2xl object-cover opacity-10 transition-opacity"
                    />

                    <div class="flex min-h-[500px] w-full flex-col justify-between">
                        <!-- Clan Header -->
                        <div class="flex items-center justify-between gap-3 p-4 pb-3">
                            <div class="flex min-w-0 flex-1 items-center space-x-4">
                                <img
                                    class="size-16 shrink-0 rounded-lg"
                                    src={item.clan.clanData?.badgeUrls.medium}
                                    alt={item.clan.clanData?.name}
                                    loading="lazy"
                                />
                                <div class="flex min-w-0 flex-col">
                                    <P class="truncate text-xl font-bold">{item.clan.clanData?.name}</P>
                                    <p class="text-xs opacity-70">{item.clan.clanData?.tag}</p>
                                </div>
                            </div>
                            <div
                                class={`${status.bgColor} ${status.color} bg-foreground/10 inset-shadow-foreground border-background mx-2 flex shrink-0 flex-col rounded-lg p-4 px-3 py-1.5 text-xs font-bold inset-shadow-sm`}
                            >
                                {status.label}
                            </div>
                        </div>

                        <!-- War Status Display -->
                        {#if war}
                            <div class="flex flex-1 flex-col space-y-3 px-4 pb-4">
                                <!-- Score Display -->
                                <div
                                    class="border-background inset-shadow-foreground bg-background/30 flex items-center justify-between rounded-xl border-1 p-4 inset-shadow-sm"
                                >
                                    <div class="flex flex-col items-center">
                                        <div class="flex items-center gap-2">
                                            <MaterialSymbolsShieldOutline class="size-5 text-blue-400" />
                                            <span class="text-2xl font-bold">{ourStats.stars}</span>
                                            <MaterialSymbolsStarRounded class="size-5 text-yellow-400" />
                                        </div>
                                        <p class="text-xs opacity-70">{ourStats.destruction.toFixed(1)}%</p>
                                    </div>

                                    <div class="flex flex-col items-center">
                                        <MaterialSymbolsSwordsCrossed class="size-8 text-red-400" />
                                        <p class="text-xs font-bold">{war.teamSize}v{war.teamSize}</p>
                                    </div>

                                    <div class="flex flex-col items-center">
                                        <div class="flex items-center gap-2">
                                            <MaterialSymbolsStarRounded class="size-5 text-yellow-400" />
                                            <span class="text-2xl font-bold">{oppStats.stars}</span>
                                            <MaterialSymbolsShieldOutline class="size-5 text-red-400" />
                                        </div>
                                        <p class="text-xs opacity-70">{oppStats.destruction.toFixed(1)}%</p>
                                    </div>
                                </div>

                                <!-- Countdown/Timer -->
                                {#if war.state === "preparation"}
                                    {@const cd = getCountdown(war.startTime, tick)}
                                    <div
                                        class="border-background inset-shadow-foreground flex items-center justify-between rounded-xl border-1 bg-yellow-600/20 p-4 inset-shadow-sm"
                                    >
                                        <div class="flex items-center gap-2">
                                            <MaterialSymbolsTimerOutline class="size-5 text-yellow-400" />
                                            <span class="text-sm font-semibold">War Starts In:</span>
                                        </div>
                                        <span class="font-mono text-lg font-bold text-green-400">{formatCountdown(cd)}</span>
                                    </div>
                                {:else if war.state === "inWar"}
                                    {@const cd = getCountdown(war.endTime, tick)}
                                    <div
                                        class="border-background inset-shadow-foreground flex items-center justify-between rounded-xl border-1 bg-orange-600/20 p-4 inset-shadow-sm"
                                    >
                                        <div class="flex items-center gap-2">
                                            <MaterialSymbolsTimerOutline class="size-5 text-orange-400" />
                                            <span class="text-sm font-semibold">War Ends In:</span>
                                        </div>
                                        <span class="font-mono text-lg font-bold text-red-400">{formatCountdown(cd)}</span>
                                    </div>
                                {:else}
                                    <div
                                        class="border-background inset-shadow-foreground flex items-center justify-center rounded-xl border-1 bg-gray-600/20 p-4 inset-shadow-sm"
                                    >
                                        <span class="text-sm font-semibold opacity-70">War Concluded</span>
                                    </div>
                                {/if}

                                <!-- Attack Stats Grid -->
                                <div class="grid grid-cols-2 gap-3">
                                    <div
                                        class="border-background inset-shadow-foreground bg-background/20 flex flex-col items-center rounded-lg border-1 p-3 inset-shadow-sm"
                                    >
                                        <p class="text-xs font-semibold uppercase opacity-70">Our Attacks</p>
                                        <p class="text-lg font-bold">{ourStats.attacksUsed}/{ourStats.attacksAvailable}</p>
                                    </div>
                                    <div
                                        class="border-background inset-shadow-foreground bg-background/20 flex flex-col items-center rounded-lg border-1 p-3 inset-shadow-sm"
                                    >
                                        <p class="text-xs font-semibold uppercase opacity-70">Attacks Left</p>
                                        <p class="text-lg font-bold text-yellow-400">{ourStats.attacksLeft}</p>
                                    </div>
                                </div>

                                <!-- Town Hall Composition -->
                                {#if ourStats.th.levels.length > 0}
                                    <div class="border-background inset-shadow-foreground bg-background/20 rounded-xl border-1 p-3 inset-shadow-sm">
                                        <p class="mb-2 text-center text-xs font-semibold uppercase opacity-70">Our Town Halls</p>
                                        <div class="flex flex-wrap justify-center gap-1.5">
                                            {#each ourStats.th.levels.slice(0, 4) as lvl}
                                                <span
                                                    class="border-background inset-shadow-foreground bg-background/60 rounded-md border-1 px-2 py-1 text-xs font-medium inset-shadow-sm"
                                                >
                                                    TH{lvl}: {ourStats.th.counts[lvl]}
                                                </span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}

                                <!-- Action Buttons -->
                                <div class="flex gap-3 pt-1">
                                    <CocButton
                                        onclick={() => {
                                            selectedWar = item;
                                            dialogOpen = true;
                                        }}
                                        class="flex-1">Full Details</CocButton
                                    >

                                    <a
                                        href={`https://points.fwafarm.com/clan?tag=${encodeURIComponent(item.clan.clanData?.tag || item.clan.clanTag)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <CocButton type="danger" class="flex-1">Points</CocButton>
                                    </a>
                                </div>
                            </div>
                        {:else}
                            <div class="flex flex-1 flex-col space-y-3 px-4 pb-4">
                                <!-- Empty Score Display -->
                                <div
                                    class="border-background inset-shadow-foreground bg-background/20 flex items-center justify-center rounded-xl border-1 p-6 opacity-40 inset-shadow-sm"
                                >
                                    <MaterialSymbolsShieldOutline class="size-12" />
                                </div>

                                <!-- Empty Status -->
                                <div
                                    class="border-background inset-shadow-foreground flex items-center justify-center rounded-xl border-1 bg-gray-600/20 p-4 opacity-40 inset-shadow-sm"
                                >
                                    <span class="text-sm font-semibold">Not In War</span>
                                </div>

                                <!-- Empty Stats -->
                                <div class="grid grid-cols-2 gap-3 opacity-40">
                                    <div
                                        class="border-background inset-shadow-foreground bg-background/20 flex flex-col items-center rounded-lg border-1 p-3 inset-shadow-sm"
                                    >
                                        <p class="text-xs font-semibold uppercase opacity-70">Our Attacks</p>
                                        <p class="text-lg font-bold">0/0</p>
                                    </div>
                                    <div
                                        class="border-background inset-shadow-foreground bg-background/20 flex flex-col items-center rounded-lg border-1 p-3 inset-shadow-sm"
                                    >
                                        <p class="text-xs font-semibold uppercase opacity-70">Attacks Left</p>
                                        <p class="text-lg font-bold">0</p>
                                    </div>
                                </div>

                                <!-- Empty Message -->
                                <div
                                    class="border-background inset-shadow-foreground bg-background/20 flex flex-col items-center justify-center rounded-xl border-1 p-4 text-center opacity-60 inset-shadow-sm"
                                >
                                    <p class="text-sm font-semibold">No Active War</p>
                                    <p class="text-xs">Check back later</p>
                                </div>

                                <!-- Disabled Buttons -->
                                <div class="flex gap-2 pt-1">
                                    <CocButton disabled type="normal" class="flex-1">Full Details</CocButton>
                                    <a
                                        href={`https://points.fwafarm.com/clan?tag=${encodeURIComponent(item.clan.clanData?.tag || item.clan.clanTag)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <CocButton type="normal" class="flex-1">Points</CocButton>
                                    </a>
                                </div>
                            </div>
                        {/if}
                    </div>
                </Card>
            {/each}
        </div>
    </div>
</div>

<!-- Detail Dialog -->
<PopupDialog title="War Details" bind:open={dialogOpen} class="max-h-[calc(100vh-100px)] !w-[95vw] !max-w-6xl overflow-scroll">
    {@const war = selectedWar?.war as APIClanWar}
    {@const ourStats = getSideStats("clan", war)}
    {@const oppStats = getSideStats("opponent", war)}

    <div class="w-full space-y-6">
        <!-- War Overview -->
        <div
            class="border-background inset-shadow-foreground bg-background/20 grid w-full grid-cols-1 gap-4 rounded-xl border-1 p-5 inset-shadow-sm md:grid-cols-3"
        >
            <div class="flex w-full flex-col items-center">
                <p class="font-coc text-xs font-semibold uppercase opacity-70">Team Size</p>
                <p class="font-coc text-2xl font-bold">{war.teamSize}v{war.teamSize}</p>
            </div>
            <div class="flex w-full flex-col items-center">
                <p class="font-coc text-xs font-semibold uppercase opacity-70">Attacks Per Member</p>
                <p class="font-coc text-2xl font-bold">{war.attacksPerMember}</p>
            </div>
            <div class="flex w-full flex-col items-center">
                <p class="font-coc text-xs font-semibold uppercase opacity-70">War State</p>
                <p class="font-coc text-2xl font-bold capitalize">{war.state.replace(/([A-Z])/g, " $1").trim()}</p>
            </div>
        </div>

        <!-- Team Comparison -->
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <!-- Our Clan -->
            <div class="border-background inset-shadow-foreground space-y-4 rounded-xl border-1 bg-blue-600/10 p-5 inset-shadow-sm">
                <div class="flex items-center gap-3">
                    <img class="size-14 rounded-lg" src={war.clan.badgeUrls.medium} alt={war.clan.name} />
                    <div>
                        <P class="text-lg font-bold">{war.clan.name}</P>
                        <p class="font-coc text-xs opacity-70">{war.clan.tag}</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <div>
                        <p class="font-coc mb-2 text-xs font-semibold uppercase opacity-70">Town Halls</p>
                        <div class="flex flex-wrap gap-2">
                            {#each ourStats.th.levels as lvl}
                                <span
                                    class="border-background inset-shadow-foreground bg-background/60 hover:bg-background/80 font-coc rounded-md border-1 px-3 py-1 inset-shadow-sm"
                                >
                                    TH{lvl}: <span class="ml-1 font-bold">{ourStats.th.counts[lvl]}</span>
                                </span>
                            {/each}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="border-background inset-shadow-foreground bg-background/40 rounded-lg border-1 p-3 inset-shadow-sm">
                            <p class="font-coc text-xs opacity-70">Attacks</p>
                            <p class="font-coc text-lg font-bold">{ourStats.attacksUsed}/{ourStats.attacksAvailable}</p>
                        </div>
                        <div class="border-background inset-shadow-foreground bg-background/40 rounded-lg border-1 p-3 inset-shadow-sm">
                            <p class="font-coc text-xs opacity-70">Remaining</p>
                            <p class="font-coc text-lg font-bold text-yellow-400">{ourStats.attacksLeft}</p>
                        </div>
                    </div>

                    <div class="border-background inset-shadow-foreground bg-background/40 rounded-lg border-1 p-3 inset-shadow-sm">
                        <p class="font-coc text-xs opacity-70">Stars</p>
                        <p class="font-coc flex items-center gap-2 text-2xl font-bold text-yellow-400">
                            {ourStats.stars}
                            <MaterialSymbolsStarRounded class="size-6" />
                        </p>
                    </div>

                    <div class="border-background inset-shadow-foreground bg-background/40 rounded-lg border-1 p-3 inset-shadow-sm">
                        <p class="font-coc text-xs opacity-70">Destruction</p>
                        <p class="font-coc text-2xl font-bold">{ourStats.destruction.toFixed(2)}%</p>
                    </div>
                </div>
            </div>

            <!-- Opponent -->
            <div class="border-background inset-shadow-foreground space-y-4 rounded-xl border-1 bg-red-600/10 p-5 inset-shadow-sm">
                <div class="flex items-center gap-3">
                    <img class="size-14 rounded-lg" src={war.opponent.badgeUrls.medium} alt={war.opponent.name} />
                    <div>
                        <P class="text-lg font-bold">{war.opponent.name}</P>
                        <p class="font-coc text-xs opacity-70">{war.opponent.tag}</p>
                    </div>
                </div>

                <div class="space-y-3">
                    <div>
                        <p class="font-coc mb-2 text-xs font-semibold uppercase opacity-70">Town Halls</p>
                        <div class="flex flex-wrap gap-2">
                            {#each oppStats.th.levels as lvl}
                                <span
                                    class="border-background inset-shadow-foreground bg-background/60 hover:bg-background/80 font-coc rounded-md border-1 px-3 py-1 inset-shadow-sm"
                                >
                                    TH{lvl}: <span class="ml-1 font-bold">{oppStats.th.counts[lvl]}</span>
                                </span>
                            {/each}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-background/40 inset-shadow-foreground rounded-lg p-3 inset-shadow-sm">
                            <p class="font-coc text-xs opacity-70">Attacks</p>
                            <p class="font-coc text-lg font-bold">{oppStats.attacksUsed}/{oppStats.attacksAvailable}</p>
                        </div>
                        <div class="bg-background/40 inset-shadow-foreground rounded-lg p-3 inset-shadow-sm">
                            <p class="font-coc text-xs opacity-70">Remaining</p>
                            <p class="font-coc text-lg font-bold text-yellow-400">{oppStats.attacksLeft}</p>
                        </div>
                    </div>

                    <div class="bg-background/40 inset-shadow-foreground rounded-lg p-3 inset-shadow-sm">
                        <p class="font-coc text-xs opacity-70">Stars</p>
                        <p class="font-coc flex items-center gap-2 text-2xl font-bold text-yellow-400">
                            {oppStats.stars}
                            <MaterialSymbolsStarRounded class="size-6" />
                        </p>
                    </div>

                    <div class="bg-background/40 inset-shadow-foreground rounded-lg p-3 inset-shadow-sm">
                        <p class="font-coc text-xs opacity-70">Destruction</p>
                        <p class="font-coc text-2xl font-bold">{oppStats.destruction.toFixed(2)}%</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="border-background bg-background/20 border-t-2 pt-4">
            <a
                href={`https://points.fwafarm.com/clan?tag=${encodeURIComponent(selectedWar?.clan.clanData?.tag || selectedWar?.clan.clanTag || "")}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <CocButton type="normal" class="w-full font-bold">View Point System</CocButton>
            </a>
        </div>
    </div>
</PopupDialog>
