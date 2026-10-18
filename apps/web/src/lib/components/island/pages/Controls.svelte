<script lang="ts">
    import { page } from "$app/state";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import { clearSiteCache } from "$lib/utils/cache";
    import { onMount, tick } from "svelte";
    import TablerMaximize from "~icons/tabler/maximize";
    import TablerMinimize from "~icons/tabler/minimize";
    import TablerMusic from "~icons/tabler/music";
    import TablerMusicOff from "~icons/tabler/music-off";
    import TablerPlayerPause from "~icons/tabler/player-pause";
    import TablerPlayerPlay from "~icons/tabler/player-play";
    import TablerTrash from "~icons/tabler/trash";
    import { player } from "../music/player.svelte";

    let isFullscreen = $state(false);
    let video = $state<HTMLVideoElement | null>(null);
    let videoPlaying = $state(false);

    onMount(() => {
        const sync = () => (isFullscreen = !!document.fullscreenElement);
        sync();
        document.addEventListener("fullscreenchange", sync);
        return () => document.removeEventListener("fullscreenchange", sync);
    });

    $effect(() => {
        void page.url.pathname;
        void tick().then(() => {
            video = document.getElementById("bg-video") as HTMLVideoElement | null;
            videoPlaying = !!video && !video.paused;
        });
    });

    function toggleFullscreen() {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(console.error);
    }

    function toggleVideo() {
        if (!video) return;
        if (video.paused) video.play().catch(console.error);
        else video.pause();
        videoPlaying = !video.paused;
    }

    const btn = "size-12 rounded-full";
</script>

<div class="flex flex-wrap justify-center gap-3 py-1">
    <Button
        tooltip={player.playing ? `Pause ${player.current.title}` : `Play ${player.current.title}`}
        tooltipPlacement="top"
        class={btn}
        size=""
        onclick={() => player.toggle()}
    >
        {#if player.playing}
            <TablerMusic class="size-6" />
        {:else}
            <TablerMusicOff class="size-6" />
        {/if}
    </Button>

    <Button tooltip="Toggle fullscreen" tooltipPlacement="top" class={btn} size="" onclick={toggleFullscreen}>
        {#if isFullscreen}
            <TablerMinimize class="size-6" />
        {:else}
            <TablerMaximize class="size-6" />
        {/if}
    </Button>

    {#if video}
        <Button tooltip="Toggle background video" tooltipPlacement="top" class={btn} size="" onclick={toggleVideo}>
            {#if videoPlaying}
                <TablerPlayerPause class="size-6" />
            {:else}
                <TablerPlayerPlay class="size-6" />
            {/if}
        </Button>
    {/if}

    <ConfirmationDialog
        title="Clear Site Cache"
        description="Are you sure you want to clear the website cache and reload? You may need to log back in."
        confirmText="Clear Cache"
        onConfirm={clearSiteCache}
    >
        <Button tooltip="Clear website cache" tooltipPlacement="top" class={btn} size="">
            <TablerTrash class="size-6" />
        </Button>
    </ConfirmationDialog>
</div>
