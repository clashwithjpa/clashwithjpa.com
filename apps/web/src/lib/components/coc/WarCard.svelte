<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import CocPopup from "$lib/components/ui/coc/CocPopup.svelte";
    import { cn } from "$lib/utils";
    import { cardSlideIn } from "$lib/utils/animations";
    import type { GetCOCClan200, GetCOCClanCurrentWar200 } from "@repo/clashofclans-client";
    import { getCOCClan, getCOCClanCurrentWar } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import Icon from "../ui/Icon.svelte";

    let {
        clanTag,
        class: className = "",
        delay = 0,
    }: {
        clanTag: string;
        class?: string;
        delay?: number;
    } = $props();

    const encodedClanTag = $derived(encodeURIComponent(clanTag));
    let clanData = $state<GetCOCClan200["data"]["clan"] | null>(null);
    let warData = $state<GetCOCClanCurrentWar200["data"]["currentWar"] | null>(null);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let timeRemaining = $state("");
    let tagCopied = $state(false);

    // Safe accessors with defaults
    const warState = $derived(warData?.state || "notInWar");
    const ourStars = $derived(warData?.clan?.stars || 0);
    const opponentStars = $derived(warData?.opponent?.stars || 0);
    const ourDestruction = $derived(warData?.clan?.destructionPercentage || 0);
    const opponentDestruction = $derived(warData?.opponent?.destructionPercentage || 0);
    const teamSize = $derived(warData?.teamSize || 0);
    const ourAttacks = $derived(warData?.clan?.attacks || 0);
    const attacksPerMember = $derived(warData?.attacksPerMember || 0);
    const ourMembers = $derived(warData?.clan?.members || []);

    // Helper to parse Supercell's ISO 8601 non-standard string (e.g. 20240321T060136.000Z) to a JS Date
    const parseCoCDate = (dateString: string) => {
        if (!dateString) return new Date();
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        const hour = dateString.substring(9, 11);
        const minute = dateString.substring(11, 13);
        const second = dateString.substring(13, 15);
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`);
    };

    onMount(() => {
        let interval: ReturnType<typeof setInterval> | undefined;

        (async () => {
            if (delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }

            try {
                const clanResponse = await getCOCClan(encodedClanTag, {
                    baseURL: PUBLIC_SERVER_URL,
                });
                if (clanResponse.success && clanResponse.data) {
                    clanData = clanResponse.data.clan;
                }

                const warResponse = await getCOCClanCurrentWar(encodedClanTag, {
                    baseURL: PUBLIC_SERVER_URL,
                });
                if (warResponse.success && warResponse.data) {
                    warData = warResponse.data.currentWar;
                }
            } catch (e) {
                console.error(`Error loading data for clan ${encodedClanTag}:`, e);
                if (e instanceof Error) {
                    const errorMsg = e.message.toLowerCase();
                    if (errorMsg.includes("too many") || errorMsg.includes("rate limit")) {
                        error = "Rate limit exceeded. Please try again later.";
                    } else if (errorMsg.includes("json")) {
                        error = "Invalid API response. Server might be down.";
                    } else if (errorMsg.includes("fetch")) {
                        error = "Network error. Please check your connection.";
                    } else {
                        error = e.message;
                    }
                } else {
                    error = "Failed to load war data";
                }
            } finally {
                loading = false;
            }

            if (warData && (warData.state === "inWar" || warData.state === "preparation")) {
                const targetTimeString = warData.state === "preparation" ? warData.startTime : warData.endTime;
                const targetTimeMs = parseCoCDate(targetTimeString).getTime();

                const updateTimer = () => {
                    const diff = targetTimeMs - Date.now();

                    if (diff <= 0) {
                        timeRemaining = "Ended";
                        if (interval) clearInterval(interval);
                        return;
                    }

                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                    // Zero-pad minutes and seconds for consistent display
                    const pad = (num: number) => num.toString().padStart(2, "0");
                    timeRemaining = `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
                };

                updateTimer();
                interval = setInterval(updateTimer, 1000);
            }
        })();

        return () => {
            if (interval) clearInterval(interval);
        };
    });

    const WAR_STATE_MAP: Record<string, string> = {
        preparation: "Preparation",
        inWar: "Battle Day",
        warEnded: "Ended",
        notInWar: "Not in War",
    };
    const getWarState = (state: string) => WAR_STATE_MAP[state] || state;

    const townHallBreakdown = $derived.by(() => {
        const thCounts: Record<number, number> = {};
        for (const member of ourMembers) {
            const th = member.townhallLevel;
            thCounts[th] = (thCounts[th] || 0) + 1;
        }
        return Object.entries(thCounts)
            .sort(([a], [b]) => Number(b) - Number(a))
            .slice(0, 4);
    });

    const attacksRemaining = $derived.by(() => {
        if (!attacksPerMember || !teamSize) return 0;
        const totalAttacks = teamSize * attacksPerMember;
        return totalAttacks - ourAttacks;
    });

    const copyTagToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(clanTag);
            tagCopied = true;
            setTimeout(() => {
                tagCopied = false;
            }, 2000);
        } catch (err) {
            console.error("Failed to copy tag:", err);
        }
    };

    const displayClanName = $derived(clanData?.name || warData?.clan?.name || clanTag);
    const displayBadge = $derived(clanData?.badgeUrls?.large || warData?.clan?.badgeUrls?.large || "");
</script>

<CocCard class={cn("origin-center transform transition-all duration-200 hover:scale-102", className)}>
    {#if loading}
        <div class="flex min-h-64 items-center justify-center p-6" in:fade={{ duration: 200 }}>
            <div class="flex flex-col items-center gap-4">
                <SvgSpinnersBlocksScale class="size-12 text-stone-700" />
                <p class="font-coc text-lg font-bold text-stone-700">Loading war...</p>
            </div>
        </div>
    {:else if error || !warData}
        <div class="flex min-h-64 items-center justify-center p-6" in:fade={{ duration: 200 }}>
            <div class="flex flex-col items-center gap-4 text-center">
                <p class="font-coc text-xl font-bold text-red-700">Error Loading War</p>
                <p class="font-coc text-sm text-stone-700">{error || "War data not found"}</p>
            </div>
        </div>
    {:else}
        <div class="flex min-h-64 flex-col gap-4 overflow-hidden p-5" in:fade={{ duration: 200 }} use:cardSlideIn>
            <!-- Header with Badge, Name, Tag and War State -->
            <div class="flex items-center gap-4">
                {#if displayBadge}
                    <div
                        class="size-16 shrink-0 bg-cover bg-center bg-no-repeat drop-shadow-lg"
                        style="background-image: url('{displayBadge}');"
                    ></div>
                {:else}
                    <div class="size-16 shrink-0 rounded-full bg-stone-900/20 drop-shadow-lg"></div>
                {/if}
                <div class="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 class="truncate font-coc text-xl font-black tracking-wide text-stone-900 text-shadow-sm md:text-2xl">
                        {displayClanName}
                    </h3>
                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            class="shrink-0 cursor-copy border-none font-coc text-xs transition-colors"
                            class:text-green-700={tagCopied}
                            class:text-stone-700={!tagCopied}
                            onclick={copyTagToClipboard}
                        >
                            {#if tagCopied}
                                <span in:fade={{ duration: 200 }}>Copied!</span>
                            {:else}
                                <span in:fade={{ duration: 200 }}>{clanTag}</span>
                            {/if}
                        </button>
                        {#if clanData?.clanLevel}
                            <div
                                class="flex shrink-0 items-center justify-center gap-1 rounded border border-yellow-800/50 bg-yellow-800/60 px-1.5 py-0.5"
                            >
                                <Icon name="trophy" class="size-3" />
                                <span class="font-rubik text-xs font-bold text-[#F8E30A]">Level {clanData.clanLevel}</span>
                            </div>
                        {/if}
                        <div class="min-w-0 flex-1">
                            <div
                                class={`inline-flex items-center justify-center gap-1 truncate rounded border px-1.5 py-0.5 ${
                                    warState === "inWar"
                                        ? "border-green-700/50 bg-green-700/60"
                                        : warState === "preparation"
                                          ? "border-orange-700/50 bg-orange-700/60"
                                          : "border-stone-700/50 bg-stone-700/60"
                                }`}
                            >
                                <span class="truncate font-rubik text-xs font-bold tracking-wide text-green-50 shadow-none">
                                    {getWarState(warState)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Battle Stats: Stars Comparison -->
            <div class="flex items-center justify-center gap-6 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                <!-- Our Stars -->
                <div class="flex items-start gap-2">
                    <Icon name="star" class="size-8" />
                    <div class="flex flex-col items-center justify-center">
                        <span class="font-coc text-4xl font-black text-stone-900">{ourStars}</span>
                        <span class="font-coc text-xs font-bold text-stone-700">{ourDestruction.toFixed(1)}%</span>
                    </div>
                </div>

                <!-- VS -->
                <span class="font-coc text-2xl font-black text-stone-700">VS</span>

                <!-- Opponent Stars -->
                <div class="flex items-start gap-2">
                    <div class="flex flex-col items-center justify-center">
                        <span class="font-coc text-4xl font-black text-stone-900">{opponentStars}</span>
                        <span class="font-coc text-xs font-bold text-stone-700">{opponentDestruction.toFixed(1)}%</span>
                    </div>
                    <Icon name="star" class="size-8" />
                </div>
            </div>

            <!-- War Size -->
            <div class="flex items-center justify-center">
                <div class="flex items-center justify-center gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                    <Icon name="swords" class="size-8" />
                    <span class="font-coc text-lg font-black text-stone-900">{teamSize > 0 ? `${teamSize}v${teamSize}` : "N/A"}</span>
                </div>
            </div>

            <!-- Timer -->
            {#if warState === "inWar" || warState === "preparation"}
                <div class="flex items-center justify-center gap-6 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                    <Icon name="clock" class="size-8" />
                    <div class="flex flex-col items-center">
                        <span class="font-coc text-xs font-bold text-stone-700 uppercase">
                            {warState === "preparation" ? "War Starts In" : "War Ends In"}
                        </span>
                        <span class="font-coc text-lg font-black text-stone-900">{timeRemaining || "N/A"}</span>
                    </div>
                </div>
            {/if}

            <!-- Attack Progress (Side by Side) -->
            {#if warState === "inWar" && attacksPerMember > 0}
                <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col items-center gap-1 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                        <span class="font-coc text-xs font-bold text-stone-700 uppercase">Our Attacks</span>
                        <span class="font-coc text-2xl font-black text-stone-900">
                            {ourAttacks}/{teamSize * attacksPerMember}
                        </span>
                    </div>
                    <div class="flex flex-col items-center gap-1 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                        <span class="font-coc text-xs font-bold text-stone-700 uppercase">Attacks Left</span>
                        <span class="font-coc text-2xl font-black text-stone-900">{attacksRemaining}</span>
                    </div>
                </div>
            {/if}

            <!-- Town Hall Breakdown -->
            {#if ourMembers.length > 0}
                <div>
                    <h4 class="mb-2 font-coc text-xs font-bold tracking-wide text-stone-800 uppercase">Our Town Halls</h4>
                    <div class="grid grid-cols-2 gap-2">
                        {#each townHallBreakdown as [th, count]}
                            <div
                                class="flex items-center justify-between gap-1 rounded-lg bg-stone-900/10 px-2 py-1.5 inset-shadow-sm shadow-stone-900"
                            >
                                <div class="flex items-center gap-1">
                                    <Icon name="th/{th}" class="size-10" />
                                    <span class="font-coc text-sm font-bold text-stone-700">TH{th}</span>
                                </div>
                                <span class="font-coc text-base font-black text-stone-900">{count}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Action Buttons -->
            <div class="grid grid-cols-2 gap-2">
                <CocBtn
                    variant="orange"
                    size="sm"
                    class="w-full"
                    href="https://link.clashofclans.com/?action=OpenClanProfile&tag={encodedClanTag}"
                    target="_blank"
                >
                    <span>Clan</span>
                </CocBtn>

                <CocPopup title="War Points" placement="right" contentClass="p-0" maxWidth="w-150">
                    {#snippet trigger()}
                        <CocBtn variant="red" size="sm" class="w-full">
                            <span>Points</span>
                        </CocBtn>
                    {/snippet}
                    {#snippet children()}
                        <div class="h-96 w-full overflow-hidden rounded-lg">
                            <iframe
                                src="https://points.fwafarm.com/clan?tag={encodedClanTag}"
                                title="War Points"
                                class="size-full border-none"
                                loading="lazy"
                            ></iframe>
                        </div>
                    {/snippet}
                </CocPopup>
            </div>
        </div>
    {/if}
</CocCard>

<style>
    .text-shadow-sm {
        text-shadow:
            0 1px 2px rgba(0, 0, 0, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.2);
    }
</style>
