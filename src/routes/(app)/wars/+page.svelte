<script lang="ts">
    import Card from "$lib/components/app/Card.svelte";
    import H1 from "$lib/components/app/H1.svelte";
    import InlineLink from "$lib/components/app/InlineLink.svelte";
    import P from "$lib/components/app/P.svelte";
    import type { PageData } from "./$types";
    import type { APIClanWar } from "$lib/coc/types";

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

    function getCountdown(targetISO?: string) {
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
                    {#key tick}
                        <Card class="border-background relative size-full items-stretch rounded-xl border-2 bg-linear-to-b {cardGradient} shadow-background shadow-[0_0_5px_0.5px_var(--tw-shadow-color)] inset-shadow-sm">
                            <img src="/cards_bg.webp" alt="Card Background" class="absolute inset-0 -z-10 size-full rounded-xl object-cover opacity-10" />
                            <div class="flex flex-col justify-between">
                                <div class="flex w-80 items-center space-x-4 p-4">
                                    <img class="size-20" src={item.clan.clanData?.badgeUrls.medium} alt={item.clan.clanData?.name} />
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
                                            <p>Starts In: {getCountdown((item.war as APIClanWar).startTime)}</p>
                                        {:else if (item.war as APIClanWar).state === 'inWar'}
                                            <p class="font-semibold">State: In War</p>
                                            <p>
                                                Score: {(item.war as APIClanWar).clan.stars} ⭐ vs {(item.war as APIClanWar).opponent.stars} ⭐
                                            </p>
                                            <p>Ends In: {getCountdown((item.war as APIClanWar).endTime)}</p>
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

                                {#if item.war && ((item.war as APIClanWar).state === 'inWar' || (item.war as APIClanWar).state === 'warEnded')}
                                    <div class="mx-2 mb-2 flex flex-col">
                                        <p class="p-4 text-center">Opponent</p>
                                        <div class="border-background bg-foreground/10 inset-shadow-foreground flex w-full items-center space-x-3 rounded-xl border-1 p-4 inset-shadow-sm">
                                            <img class="size-11" src={(item.war as APIClanWar).opponent.badgeUrls.medium} alt={(item.war as APIClanWar).opponent.name} />
                                            <div class="flex flex-col">
                                                <p class="text-sm">{(item.war as APIClanWar).opponent.name}</p>
                                                <p class="text-xs opacity-80">{(item.war as APIClanWar).opponent.tag}</p>
                                            </div>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </Card>
                    {/key}
                {/each}
            </div>
        </div>
    </div>
</div>
