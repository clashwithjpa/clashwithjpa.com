<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import Popup from "$lib/components/ui/RawPopup.svelte";
    import { spinOnce } from "$lib/utils/animations";
    import { draggable, events } from "@neodrag/svelte";
    import { onMount } from "svelte";
    import TablerIcons from "~icons/tabler/icons";
    import TablerMaximize from "~icons/tabler/maximize";
    import TablerMinimize from "~icons/tabler/minimize";
    import TablerMusic from "~icons/tabler/music";
    import TablerMusicOff from "~icons/tabler/music-off";
    import TablerPlayerPause from "~icons/tabler/player-pause";
    import TablerPlayerPlay from "~icons/tabler/player-play";
    import TablerTrash from "~icons/tabler/trash";

    let isMusicPlaying = $state(false);
    let isVideoPlaying = $state(true); // Assuming autoplay on page load
    let hasVideo = $state(false);
    let isFullscreen = $state(false);
    let audio: HTMLAudioElement;

    onMount(() => {
        audio = new Audio("/music/coc_lofi.ogg");
        audio.loop = true;

        checkVideo();

        document.addEventListener("fullscreenchange", () => {
            isFullscreen = !!document.fullscreenElement;
        });
    });

    function checkVideo() {
        const video = document.getElementById("bg-video") as HTMLVideoElement;
        hasVideo = !!video;
        if (video) {
            isVideoPlaying = !video.paused;
        }
    }

    function toggleMusic() {
        if (!audio) return;
        if (isMusicPlaying) {
            audio.pause();
        } else {
            audio.play().catch(console.error);
        }
        isMusicPlaying = !isMusicPlaying;
    }

    function toggleVideo() {
        const video = document.getElementById("bg-video") as HTMLVideoElement;
        if (video) {
            if (isVideoPlaying) {
                video.pause();
            } else {
                video.play().catch(console.error);
            }
            isVideoPlaying = !isVideoPlaying;
        }
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(console.error);
        } else {
            document.exitFullscreen();
        }
    }

    async function clearSiteCache() {
        localStorage.clear();
        sessionStorage.clear();

        if ("caches" in window) {
            try {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map((name) => caches.delete(name)));
            } catch (err) {
                console.error("Error clearing caches", err);
            }
        }

        if ("serviceWorker" in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            } catch (err) {
                console.error("Error unregistering service workers", err);
            }
        }

        window.location.reload();
    }

    let open = $state(false);

    function handleOpenChange(details: { open: boolean }) {
        open = details.open;
        if (open) {
            checkVideo();
        }
    }

    function handleDragEnd() {
        setTimeout(() => {
            window.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        }, 10);
    }
</script>

<div {@attach draggable([events({ onDragStart: () => (open = false), onDragEnd: handleDragEnd })])} class="fixed right-4 bottom-4 z-40">
    <Popup placement="top" contentClass="flex flex-col gap-4 rounded-full p-2" bind:open onOpenChange={handleOpenChange}>
        {#snippet trigger()}
            <Button class="size-14 rounded-full" size="" variant="ghost" onclick={(e) => spinOnce(e.currentTarget as Element)}>
                <TablerIcons class="pointer-events-none size-6" />
            </Button>
        {/snippet}

        {#snippet children()}
            <ConfirmationDialog
                title="Clear Site Cache"
                description="Are you sure you want to clear the website cache and reload? You may need to log back in."
                confirmText="Clear Cache"
                onConfirm={clearSiteCache}
            >
                {#snippet trigger()}
                    <Button title="Clear Website Cache" class="size-12 rounded-full" size="">
                        <TablerTrash class="size-6" />
                    </Button>
                {/snippet}
            </ConfirmationDialog>

            <Button title="Toggle Fullscreen" class="size-12 rounded-full" size="" onclick={toggleFullscreen}>
                {#if isFullscreen}
                    <TablerMinimize class="size-6" />
                {:else}
                    <TablerMaximize class="size-6" />
                {/if}
            </Button>

            {#if hasVideo}
                <Button title="Toggle Background Video" class="size-12 rounded-full" size="" onclick={toggleVideo}>
                    {#if isVideoPlaying}
                        <TablerPlayerPause class="size-6" />
                    {:else}
                        <TablerPlayerPlay class="size-6" />
                    {/if}
                </Button>
            {/if}

            <Button title="Toggle Lofi Music" class="size-12 rounded-full" size="" onclick={toggleMusic}>
                {#if isMusicPlaying}
                    <TablerMusic class="size-6" />
                {:else}
                    <TablerMusicOff class="size-6" />
                {/if}
            </Button>
        {/snippet}
    </Popup>
</div>
