<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { authClient } from "$lib/auth";
    import CustomizePopup from "$lib/components/CustomizePopup.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import RawPopup from "$lib/components/ui/RawPopup.svelte";
    import { drawRing, emptyRing, rotateToggle } from "$lib/utils/animations";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { bounds, BoundsFrom, draggable, events } from "@neodrag/svelte";
    import { onMount, setContext, tick } from "svelte";
    import { toast } from "svelte-sonner";
    import TablerIcons from "~icons/tabler/icons";
    import TablerMaximize from "~icons/tabler/maximize";
    import TablerMinimize from "~icons/tabler/minimize";
    import TablerMusic from "~icons/tabler/music";
    import TablerMusicOff from "~icons/tabler/music-off";
    import TablerPlayerPause from "~icons/tabler/player-pause";
    import TablerPlayerPlay from "~icons/tabler/player-play";
    import TablerSpyOff from "~icons/tabler/spy-off";
    import TablerTrash from "~icons/tabler/trash";

    const session = authClient.useSession();
    let isImpersonating = $derived(!!$session.data?.session?.impersonatedBy);
    let stoppingImpersonation = $state(false);

    async function stopImpersonating() {
        stoppingImpersonation = true;
        const { error } = await authClient.admin.stopImpersonating();
        if (error) {
            toast.error("Failed to stop impersonating", { description: error.message });
            stoppingImpersonation = false;
        } else {
            await $session.refetch?.();
            toast.success("Stopped impersonating");
            await goto("/admin/users", { invalidateAll: true });
            stoppingImpersonation = false;
        }
    }

    let isMusicPlaying = $state(false);
    let isVideoPlaying = $state(true);
    let hasVideo = $state(false);
    let isFullscreen = $state(false);
    let audio: HTMLAudioElement;

    onMount(() => {
        audio = new Audio("/music/coc_lofi.ogg");
        audio.loop = true;
        document.addEventListener("fullscreenchange", () => {
            isFullscreen = !!document.fullscreenElement;
        });
    });

    function checkVideo() {
        const video = document.getElementById("bg-video") as HTMLVideoElement;
        hasVideo = !!video;
        if (video) isVideoPlaying = !video.paused;
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
    let triggerButton = $state<HTMLElement | null>(null);
    let impersonationRing = $state<SVGCircleElement | null>(null);
    let showRing = $state(false);

    $effect(() => {
        if (isImpersonating) showRing = true;
    });

    $effect(() => {
        if (!impersonationRing) return;
        if (isImpersonating) {
            drawRing(impersonationRing);
        } else if (showRing) {
            emptyRing(impersonationRing, () => (showRing = false));
        }
    });

    function handleOpenChange() {
        if (open) {
            checkVideo();
        }
    }

    $effect(() => {
        page.url.pathname;
        void tick().then(checkVideo);
        if (triggerButton) {
            rotateToggle(triggerButton, open);
        }
    });

    function handleDragEnd() {
        setTimeout(() => {
            window.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        }, 10);
    }

    let isMobile = $state(false);

    onMount(() => {
        const cleanup = createMobileMediaQuery((mobile) => {
            isMobile = mobile;
        }, "lg");
        return cleanup;
    });

    setContext("render-inline", true);
</script>

<div
    {@attach draggable([events({ onDragStart: () => (open = false), onDragEnd: handleDragEnd }), bounds(BoundsFrom.viewport())])}
    class="fixed right-4 bottom-4 z-60 active:cursor-grabbing"
    class:bottom-20={(page.url.pathname.startsWith("/admin") || page.url.pathname.startsWith("/dashboard")) && isMobile}
>
    <RawPopup placement="top" contentClass="flex flex-col gap-4 rounded-full p-2 z-60" bind:open onOpenChange={handleOpenChange}>
        {#snippet trigger()}
            <div bind:this={triggerButton} class="relative">
                <Button class="size-14 rounded-full" size="" variant="ghost">
                    <TablerIcons class="pointer-events-none size-6" />
                </Button>
                {#if showRing}
                    <svg class="pointer-events-none absolute inset-0 size-full -rotate-90 overflow-visible" viewBox="0 0 56 56" fill="none">
                        <circle bind:this={impersonationRing} cx="28" cy="28" r="27" stroke="#f59e0b" stroke-width="2" />
                    </svg>
                {/if}
            </div>
        {/snippet}

        {#snippet children()}
            {#if isImpersonating}
                <Button
                    tooltip={`Stop impersonating ${$session.data?.user.name ?? "user"}`}
                    variant="orange"
                    class="size-12 rounded-full"
                    size=""
                    disabled={stoppingImpersonation}
                    onclick={stopImpersonating}
                >
                    <TablerSpyOff class="size-6" />
                </Button>
            {/if}

            <ConfirmationDialog
                title="Clear Site Cache"
                description="Are you sure you want to clear the website cache and reload? You may need to log back in."
                confirmText="Clear Cache"
                onConfirm={clearSiteCache}
            >
                <Button tooltip="Clear Website Cache" class="size-12 rounded-full" size="">
                    <TablerTrash class="size-6" />
                </Button>
            </ConfirmationDialog>

            <CustomizePopup />

            <Button tooltip="Toggle Fullscreen" class="size-12 rounded-full" size="" onclick={toggleFullscreen}>
                {#if isFullscreen}
                    <TablerMinimize class="size-6" />
                {:else}
                    <TablerMaximize class="size-6" />
                {/if}
            </Button>

            {#if hasVideo}
                <Button tooltip="Toggle Background Video" class="size-12 rounded-full" size="" onclick={toggleVideo}>
                    {#if isVideoPlaying}
                        <TablerPlayerPause class="size-6" />
                    {:else}
                        <TablerPlayerPlay class="size-6" />
                    {/if}
                </Button>
            {/if}

            <Button tooltip="Toggle Lofi Music" class="size-12 rounded-full" size="" onclick={toggleMusic}>
                {#if isMusicPlaying}
                    <TablerMusic class="size-6 animate-spin animation-duration-8000" />
                {:else}
                    <TablerMusicOff class="size-6" />
                {/if}
            </Button>
        {/snippet}
    </RawPopup>
</div>
