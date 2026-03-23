<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import CocCard from "$lib/components/ui/coc/CocCard.svelte";
    import CocPopup from "$lib/components/ui/coc/CocPopup.svelte";
    import { cn } from "$lib/utils";
    import { cardSlideIn } from "$lib/utils/animations";
    import type { GetCOCClan200 } from "@repo/clashofclans-client";
    import { getCOCClan } from "@repo/clashofclans-client";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerMapPin from "~icons/tabler/map-pin";
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
    let clanData: GetCOCClan200["data"]["clan"] | null = $state(null);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let tagCopied = $state(false);

    let leader = $derived(clanData!.memberList?.find((m: GetCOCClan200["data"]["clan"]["memberList"][0]) => m.role === "leader"));
    let coLeaders = $derived(clanData!.memberList?.filter((m: GetCOCClan200["data"]["clan"]["memberList"][0]) => m.role === "coLeader") || []);

    onMount(async () => {
        if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        try {
            const response = await getCOCClan(encodedClanTag, {
                baseURL: PUBLIC_SERVER_URL,
            });
            if (response.success && response.data) {
                clanData = response.data.clan;
            } else {
                error = "Failed to load clan data";
            }
        } catch (e) {
            console.error(`Error loading clan ${encodedClanTag}:`, e);

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
                error = "Failed to load clan";
            }
        } finally {
            loading = false;
        }
    });

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat("en-US").format(num);
    };

    const formatWarFrequency = (freq?: string) => {
        if (!freq) return "Unknown";
        const map: Record<string, string> = {
            always: "Always",
            moreThanOncePerWeek: "> 1/week",
            oncePerWeek: "1/week",
            lessThanOncePerWeek: "< 1/week",
            never: "Never",
            unknown: "Unknown",
        };
        return map[freq] || freq;
    };

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
</script>

<CocCard class={cn("origin-center transform transition-all duration-200 hover:scale-102", className)}>
    {#if loading}
        <div class="flex min-h-64 items-center justify-center p-6" in:fade={{ duration: 200 }}>
            <div class="flex flex-col items-center gap-4">
                <SvgSpinnersBlocksScale class="size-12 text-stone-700" />
                <p class="font-coc text-lg font-bold text-stone-700">Loading clan...</p>
            </div>
        </div>
    {:else if error || !clanData}
        <div class="flex min-h-64 items-center justify-center p-6" in:fade={{ duration: 200 }}>
            <div class="flex flex-col items-center gap-4 text-center">
                <p class="font-coc text-xl font-bold text-red-700">Error Loading Clan</p>
                <p class="font-coc text-sm text-stone-700">{error || "Clan not found"}</p>
            </div>
        </div>
    {:else}
        <div class="flex min-h-64 flex-col gap-4 overflow-hidden p-5" in:fade={{ duration: 200 }} use:cardSlideIn>
            <!-- Header with Badge, Name, Tag -->
            <div class="flex items-center gap-4">
                <div
                    class="size-16 shrink-0 bg-cover bg-center bg-no-repeat drop-shadow-lg"
                    style="background-image: url('{clanData.badgeUrls.large}');"
                ></div>
                <div class="flex flex-1 flex-col gap-1 overflow-hidden">
                    <h3 class="truncate font-coc text-xl font-black tracking-wide text-stone-900 text-shadow-sm md:text-2xl">
                        {clanData.name}
                    </h3>
                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            class="cursor-copy border-none font-coc text-xs transition-colors"
                            class:text-green-700={tagCopied}
                            class:text-stone-700={!tagCopied}
                            onclick={copyTagToClipboard}
                        >
                            {#if tagCopied}
                                <span in:fade={{ duration: 200 }}>Copied!</span>
                            {:else}
                                <span in:fade={{ duration: 200 }}>{clanData.tag}</span>
                            {/if}
                        </button>
                        <div class="flex items-center justify-center gap-1 rounded border border-yellow-800/50 bg-yellow-800/60 px-1.5 py-0.5">
                            <Icon name="trophy" class="size-3" />
                            <span class="font-rubik text-xs font-bold text-[#F8E30A]">Level {clanData.clanLevel}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Member Count -->
            <div class="flex items-center justify-center gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                <Icon name="labels/international" class="size-10" />
                <span class="font-coc text-2xl font-black text-stone-900">{clanData.members}</span>
                <span class="font-coc text-base font-bold text-stone-700">/50</span>
            </div>

            <!-- Minimum Requirements Section -->
            <div class="flex flex-col gap-2">
                <h4 class="font-coc text-sm font-bold text-stone-800 uppercase">Minimum Requirements</h4>
                <div class="grid grid-cols-2 gap-2">
                    <div class="flex items-center gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                        <Icon name="labels/trophypushing" class="size-12" />
                        <div class="flex flex-col">
                            <span class="font-coc text-xs font-bold text-stone-700">Trophies</span>
                            <span class="font-coc text-base font-black text-stone-900">{formatNumber(clanData.requiredTrophies)}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                        <Icon name="labels/donations" class="size-12" />
                        <div class="flex flex-col">
                            <span class="font-coc text-xs font-bold text-stone-700">Town Hall</span>
                            <span class="font-coc text-base font-black text-stone-900">{clanData.requiredTownhallLevel ?? "Any"}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                    <Icon name="labels/attacks" class="size-12" />
                    <div class="flex flex-col">
                        <span class="font-coc text-xs font-bold text-stone-700">War Frequency</span>
                        <span class="font-coc text-sm font-black text-stone-900">{formatWarFrequency(clanData.warFrequency)}</span>
                    </div>
                </div>
            </div>

            <!-- War League & Location -->
            <div>
                <h4 class="mb-2 font-coc text-sm font-bold text-stone-800 uppercase">Additional Details</h4>
                <div class="flex flex-col gap-2">
                    {#if clanData?.warLeague}
                        <div class="flex items-center justify-between gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                            <div class="flex items-center gap-1">
                                <Icon name="labels/clanwarleague" class="size-8" />
                                <span class="font-coc text-sm font-bold text-stone-700">War League</span>
                            </div>
                            <span class="font-coc text-sm font-black text-stone-900">{clanData.warLeague.name}</span>
                        </div>
                    {/if}
                    {#if clanData?.location}
                        <div class="flex items-center justify-between gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                            <div class="flex items-center gap-1">
                                <Icon name="labels/basedesigning" class="size-8" />
                                <span class="font-coc text-sm font-bold text-stone-700">Location</span>
                            </div>
                            <div class="flex items-center gap-1">
                                <TablerMapPin class="size-4 text-red-700" />
                                <span class="font-coc text-sm font-black text-stone-900">{clanData.location.name}</span>
                            </div>
                        </div>
                    {/if}
                    <div class="flex items-center justify-between gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                        <div class="flex items-center gap-1">
                            <Icon name="labels/farming" class="size-8" />
                            <span class="font-coc text-sm font-bold text-stone-700">War Frequency</span>
                        </div>
                        <span class="font-coc text-sm font-black text-stone-900 capitalize">
                            {clanData?.type === "open" ? "Open" : clanData?.type === "inviteOnly" ? "Invite Only" : "Closed"}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="grid grid-cols-2 gap-2">
                <CocPopup title="{clanData.name}'s Info" placement="right">
                    {#snippet trigger()}
                        <CocBtn variant="orange" size="sm" class="w-full">
                            <span>Info</span>
                        </CocBtn>
                    {/snippet}
                    {#snippet children()}
                        <div class="flex flex-col gap-4">
                            <!-- Description -->
                            {#if clanData?.description}
                                <div class="rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                                    <p class="font-coc text-sm leading-relaxed text-stone-900">
                                        {clanData.description}
                                    </p>
                                </div>
                            {/if}

                            <!-- Stats Grid -->
                            <div>
                                <h4 class="mb-2 font-coc text-sm font-bold text-stone-800 uppercase">Clan Statistics</h4>
                                <div class="grid grid-cols-2 gap-2">
                                    <div class="flex items-center gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                                        <Icon name="labels/international" class="size-12" />
                                        <div class="flex flex-col">
                                            <span class="font-coc text-xs font-bold text-stone-700">Members</span>
                                            <span class="font-coc text-base font-black text-stone-900">{clanData?.members}/50</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                                        <Icon name="labels/trophypushing" class="size-12" />
                                        <div class="flex flex-col">
                                            <span class="font-coc text-xs font-bold text-stone-700">Trophies</span>
                                            <span class="font-coc text-base font-black text-stone-900">{formatNumber(clanData?.clanPoints ?? 0)}</span
                                            >
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                                        <Icon name="labels/clancapital" class="size-12" />
                                        <div class="flex flex-col">
                                            <span class="font-coc text-xs font-bold text-stone-700">War Wins</span>
                                            <span class="font-coc text-base font-black text-stone-900">{clanData?.warWins}</span>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                                        <Icon name="labels/clanwarleague" class="size-12" />
                                        <div class="flex flex-col">
                                            <span class="font-coc text-xs font-bold text-stone-700">Win Streak</span>
                                            <span class="font-coc text-base font-black text-stone-900">{clanData?.warWinStreak}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Leadership Section -->
                            {#if leader || coLeaders.length > 0}
                                <div>
                                    <h4 class="mb-2 font-coc text-sm font-bold text-stone-800 uppercase">Leadership</h4>
                                    <div class="flex flex-col gap-2">
                                        {#if leader}
                                            <div
                                                class="flex items-center justify-between gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900"
                                            >
                                                <div class="flex items-center gap-1">
                                                    <Icon name="labels/trophypushing" class="size-8" />
                                                    <span class="font-coc text-sm font-bold text-stone-700">Leader</span>
                                                </div>
                                                <span class="font-coc text-sm font-black text-stone-900">{leader.name}</span>
                                            </div>
                                        {/if}
                                        {#if coLeaders.length > 0}
                                            <div class="flex flex-col gap-2 rounded-lg bg-stone-900/10 p-3 inset-shadow-sm shadow-stone-900">
                                                <div class="flex items-center gap-1">
                                                    <Icon name="labels/donations" class="size-8" />
                                                    <span class="font-coc text-sm font-bold text-stone-700">Co-Leaders</span>
                                                    <span class="font-coc text-xs font-bold text-stone-700">({coLeaders.length})</span>
                                                </div>
                                                <div class="flex flex-wrap gap-1.5">
                                                    {#each coLeaders as cl}
                                                        <span
                                                            class="rounded bg-stone-900/10 px-2 py-1 font-coc text-xs font-bold text-stone-900 inset-shadow-sm shadow-stone-900"
                                                        >
                                                            {cl.name}
                                                        </span>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/snippet}
                </CocPopup>

                <CocBtn
                    variant="green"
                    size="sm"
                    class="w-full"
                    href="https://link.clashofclans.com/?action=OpenClanProfile&tag={encodedClanTag}"
                    target="_blank"
                >
                    <span>Open</span>
                </CocBtn>
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
