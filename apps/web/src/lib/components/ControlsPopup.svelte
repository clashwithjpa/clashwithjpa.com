<script lang="ts">
    import { page } from "$app/state";
    import Button from "$lib/components/ui/Button.svelte";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import RawPopup from "$lib/components/ui/RawPopup.svelte";
    import { rotateToggle } from "$lib/utils/animations";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { bounds, BoundsFrom, draggable, events } from "@neodrag/svelte";
    import { animate } from "animejs";
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
    let isVideoPlaying = $state(true);
    let hasVideo = $state(false);
    let isFullscreen = $state(false);
    let audio: HTMLAudioElement;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animFrameId: number | null = null;
    let lastBeatTime = 0;
    let musicBtnWrapper: HTMLElement | null = null;

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
        if (video) isVideoPlaying = !video.paused;
    }

    function setupAudio() {
        if (audioCtx) return;
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.2;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    }

    function startBeatDetection() {
        if (!analyser || animFrameId !== null) return;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const prevData = new Uint8Array(bufferLength);
        const HISTORY = 43;
        const fluxHistory = new Float32Array(HISTORY);
        let histIdx = 0,
            histFilled = 0,
            pprevFlux = 0,
            prevFlux = 0;

        function loop() {
            if (!analyser) {
                animFrameId = null;
                return;
            }
            analyser.getByteFrequencyData(dataArray);

            let flux = 0;
            for (let i = 2; i <= 18; i++) {
                const d = dataArray[i] - prevData[i];
                if (d > 0) flux += d;
            }
            prevData.set(dataArray);

            fluxHistory[histIdx] = flux;
            histIdx = (histIdx + 1) % HISTORY;
            if (histFilled < HISTORY) {
                histFilled++;
                pprevFlux = prevFlux;
                prevFlux = flux;
                animFrameId = requestAnimationFrame(loop);
                return;
            }

            let mean = 0;
            for (let i = 0; i < HISTORY; i++) mean += fluxHistory[i];
            mean /= HISTORY;
            let variance = 0;
            for (let i = 0; i < HISTORY; i++) variance += (fluxHistory[i] - mean) ** 2;
            const stddev = Math.sqrt(variance / HISTORY);
            const threshold = mean + 1.5 * stddev;

            const now = performance.now();
            if (prevFlux > pprevFlux && prevFlux > flux && prevFlux > threshold && now - lastBeatTime > 350) {
                lastBeatTime = now;
                triggerBeatPulse(Math.min((prevFlux - threshold) / (stddev * 2), 1));
            }

            pprevFlux = prevFlux;
            prevFlux = flux;
            animFrameId = requestAnimationFrame(loop);
        }

        animFrameId = requestAnimationFrame(loop);
    }

    function triggerBeatPulse(intensity: number) {
        if (!musicBtnWrapper) return;
        const s = 1.04 + intensity * 0.08;
        animate(musicBtnWrapper, { scale: [1, s, 1 - (s - 1) * 0.5, 1 + (s - 1) * 0.2, 1], duration: 220, ease: "out(4)" });
    }

    function toggleMusic() {
        if (!audio) return;
        if (isMusicPlaying) {
            audio.pause();
            if (animFrameId !== null) {
                cancelAnimationFrame(animFrameId);
                animFrameId = null;
            }
        } else {
            setupAudio();
            if (audioCtx?.state === "suspended") audioCtx.resume();
            audio.play().catch(console.error);
            startBeatDetection();
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

    function handleOpenChange() {
        if (open) {
            checkVideo();
            if (isMusicPlaying) startBeatDetection();
        } else {
            if (animFrameId !== null) {
                cancelAnimationFrame(animFrameId);
                animFrameId = null;
            }
        }
    }

    // Rotate button based on open/close state
    $effect(() => {
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
</script>

<div
    {@attach draggable([events({ onDragStart: () => (open = false), onDragEnd: handleDragEnd }), bounds(BoundsFrom.viewport())])}
    // No "cursor-grab" class, as it may conflict with the button cursor, we do not want the grab cursor to conflict with the button's cursor when hovering over it
    class="fixed right-4 bottom-4 z-60 active:cursor-grabbing"
    class:bottom-20={(page.url.pathname.startsWith("/admin") || page.url.pathname.startsWith("/dashboard")) && isMobile}
>
    <RawPopup placement="top" contentClass="flex flex-col gap-4 rounded-full p-2 z-60" bind:open onOpenChange={handleOpenChange}>
        {#snippet trigger()}
            <div bind:this={triggerButton}>
                <Button class="size-14 rounded-full" size="" variant="ghost">
                    <TablerIcons class="pointer-events-none size-6" />
                </Button>
            </div>
        {/snippet}

        {#snippet children()}
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

            <span bind:this={musicBtnWrapper}>
                <Button tooltip="Toggle Lofi Music" class="size-12 rounded-full" size="" onclick={toggleMusic}>
                    {#if isMusicPlaying}
                        <TablerMusic class="size-6 animate-spin animation-duration-8000" />
                    {:else}
                        <TablerMusicOff class="size-6" />
                    {/if}
                </Button>
            </span>
        {/snippet}
    </RawPopup>
</div>
