<script lang="ts">
    import CocButton from "$lib/components/app/CocButton.svelte";
    import H1 from "$lib/components/app/ui/H1.svelte";
    import { onMount } from "svelte";
    import MaterialSymbolsPauseCircleRounded from "~icons/material-symbols/pause-circle-rounded";
    import MaterialSymbolsPlayCircleRounded from "~icons/material-symbols/play-circle-rounded";
    import MaterialSymbolsVolumeOffRounded from "~icons/material-symbols/volume-off-rounded";
    import MaterialSymbolsVolumeUpRounded from "~icons/material-symbols/volume-up-rounded";
    import type { PageData } from "./$types";

    let isPaused: boolean = $state(false);
    let isMuted: boolean = $state(true);
    let videoElement: HTMLVideoElement;

    function togglePause() {
        if (isPaused) {
            videoElement.play();
        } else {
            videoElement.pause();
        }
        isPaused = !isPaused;
    }

    function toggleMute() {
        videoElement.muted = !isMuted;
        isMuted = !isMuted;
    }

    onMount(() => {
        document.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key === " ") {
                togglePause();
            } else if (event.key === "m") {
                toggleMute();
            }
        });
    });

    interface Props {
        data?: PageData;
    }

    let { data }: Props = $props();
</script>

<svelte:head>
    <title>JPA | Home</title>
</svelte:head>

<main class="size-full">
    <img src="/clips/bg.webp" alt="Clash With JPA" class="fixed inset-0 -z-11 size-full object-cover" />
    <video bind:this={videoElement} autoplay loop muted class="fixed inset-0 -z-10 size-full object-cover">
        <source src="/clips/bg.webm" type="video/webm" />
    </video>

    <div class="z-10 flex size-full items-center justify-center bg-gray-950/50 p-5">
        <div class="flex flex-col items-center text-center sm:w-3/4 md:w-1/2">
            <H1 class="text-5xl lg:text-6xl">Clash With JPA</H1>
            <p class="mt-4 text-lg lg:text-xl">
                FWA experts in War-Farming, offering diverse clans and simultaneous 50v50 FWA wars and CWL action. Join one of the clans in our family
                today!
            </p>
            <div class="flex flex-col items-center justify-center gap-1">
                <CocButton href="/clans" size="md" class="mt-10">See our clans</CocButton>
                {#if data?.user}
                    {#if data?.applicationEnabled}
                        <CocButton href="/apply" size="md" class="mt-4">Clan Application Open!</CocButton>
                    {/if}

                    {#if data?.cwlEnabled}
                        <CocButton href="/cwl" size="md" class="mt-4">CWL Open!</CocButton>
                    {/if}
                {/if}
            </div>
        </div>
    </div>

    <div class="fixed right-8 bottom-4 z-11 flex space-x-4">
        <button onclick={togglePause} class="size-6 rounded-full transition-colors hover:text-gray-300">
            {#if isPaused}
                <MaterialSymbolsPlayCircleRounded class="size-full" />
            {:else}
                <MaterialSymbolsPauseCircleRounded class="size-full" />
            {/if}
        </button>
        <button onclick={toggleMute} class="size-6 rounded-full transition-colors hover:text-gray-300">
            {#if isMuted}
                <MaterialSymbolsVolumeOffRounded class="size-full" />
            {:else}
                <MaterialSymbolsVolumeUpRounded class="size-full" />
            {/if}
        </button>
    </div>
</main>
