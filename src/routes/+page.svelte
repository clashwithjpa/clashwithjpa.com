<script lang="ts">
    import MaterialSymbolsPauseCircleRounded from "~icons/material-symbols/pause-circle-rounded";
    import MaterialSymbolsPlayCircleRounded from "~icons/material-symbols/play-circle-rounded";
    import MaterialSymbolsVolumeUpRounded from "~icons/material-symbols/volume-up-rounded";
    import MaterialSymbolsVolumeOffRounded from "~icons/material-symbols/volume-off-rounded";
    import Button from "$lib/components/Button.svelte";
    import H1 from "$lib/components/H1.svelte";
    import { onMount } from "svelte";
    import { getClanTags } from "$lib/coc/clans/info";

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
</script>

<svelte:head>
    <title>JPA | Home</title>
</svelte:head>

<main class="size-full">
    <video bind:this={videoElement} autoplay loop muted class="fixed left-0 top-0 -z-10 size-full object-cover">
        <source src="/clips/bg.webm" type="video/webm" />
        Your browser does not support the video tag.
    </video>

    <div class="z-10 flex size-full items-center justify-center bg-gray-950/50 p-5">
        <div class="flex flex-col items-center text-center sm:w-3/4 md:w-1/2">
            <H1 class="text-4xl lg:text-5xl">Clash With JPA</H1>
            <p class="text-md mt-4 lg:text-lg">
                FWA experts in War-Farming, offering diverse clans and simultaneous 50v50 FWA wars and CWL action. Join one of the {Object.keys(
                    getClanTags()
                ).length} clans in our family today!
            </p>
            <Button href="/clans" size="md" class="mt-10">See our clans</Button>
        </div>
    </div>

    <div class="fixed bottom-4 right-8 z-[11] flex space-x-4">
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
