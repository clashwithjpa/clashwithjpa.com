<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";
    import Popup from "$lib/components/ui/Popup.svelte";
    import Toggle from "$lib/components/ui/Toggle.svelte";
    import { storage } from "$lib/utils/storage.svelte";
    import { onDestroy } from "svelte";
    import TablerBrush from "~icons/tabler/brush";
    import TablerMoon from "~icons/tabler/moon";
    import TablerSnowflake from "~icons/tabler/snowflake";

    let lightMode = $state(false);
    let busy = $state(false);
    let bear = $state<HTMLElement | null>(null);
    let paw = $state<HTMLElement | null>(null);

    let toggleCount = $state(0);
    let mood = $state<"calm" | "annoyed" | "angry">("calm");
    let curse = $state(false);
    let watchTimer: ReturnType<typeof setTimeout> | undefined;

    // How far the bear head peeks up (% of its own height, clipped by the mask above the toggle).
    const BEAR = { hidden: "100%", peek: "40%", lean: "24%", watch: "54%" };
    // Arm swing angles (deg). The arm hinges at a shoulder pivot right under the bear,
    const PAW = { hide: 130, reach: -32, bat: 24 };

    const EASE = {
        out3: "cubic-bezier(0.33, 1, 0.68, 1)",
        out2: "cubic-bezier(0.5, 1, 0.89, 1)",
        in2: "cubic-bezier(0.11, 0, 0.5, 0)",
        inOut: "cubic-bezier(0.45, 0, 0.55, 1)",
    };

    const bearAt = (y: string, rotate = 0) => ({ transform: `translateY(${y}) rotate(${rotate}deg)` });
    const pawAt = (rotate: number) => ({ transform: `rotate(${rotate}deg)` });

    async function play(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
        const anim = el.animate(keyframes, { fill: "forwards", ...options });
        await anim.finished;
        try {
            anim.commitStyles();
        } finally {
            anim.cancel();
        }
    }

    function clearWatch() {
        if (watchTimer) {
            clearTimeout(watchTimer);
            watchTimer = undefined;
        }
    }

    async function retractBear(target: HTMLElement) {
        curse = false;
        await play(target, [bearAt(BEAR.hidden)], { duration: 260, easing: EASE.in2 });
        busy = false;
        mood = "calm";
    }

    function startWatch(target: HTMLElement) {
        busy = false;
        void play(target, [bearAt(BEAR.watch)], { duration: 300, easing: EASE.out2 });
        clearWatch();
        watchTimer = setTimeout(() => {
            curse = false;
            mood = "calm";
            void play(target, [bearAt(BEAR.hidden)], { duration: 320, easing: EASE.in2 });
        }, 2800);
    }

    async function handleLightToggle(checked: boolean) {
        if (!checked || busy || !bear || !paw) return;
        const bearEl = bear;
        const pawEl = paw;
        clearWatch();
        busy = true;
        toggleCount += 1;

        const angry = toggleCount >= 6;
        const annoyed = toggleCount >= 3;
        mood = angry ? "angry" : annoyed ? "annoyed" : "calm";
        curse = angry;

        const perch = angry ? BEAR.lean : BEAR.peek;

        try {
            // Head pops up behind the switch, then the arm swings down onto the knob.
            void play(bearEl, [bearAt(perch)], { duration: 220, easing: EASE.out3 });
            await play(pawEl, [pawAt(PAW.hide), pawAt(PAW.reach)], { duration: 240, delay: 160, easing: EASE.out3 });

            // Contact — swat the knob off, then tuck the arm back up.
            lightMode = false;
            await play(pawEl, [pawAt(PAW.bat)], { duration: 140, easing: EASE.inOut });
            await play(pawEl, [pawAt(PAW.hide)], { duration: 240, easing: EASE.in2 });

            if (angry) {
                await play(bearEl, [bearAt(perch, -5), bearAt(perch, 6), bearAt(perch, -4), bearAt(perch, 0)], {
                    duration: 320,
                    easing: EASE.inOut,
                });
                startWatch(bearEl);
            } else {
                await retractBear(bearEl);
            }
        } catch {
            busy = false;
        }
    }

    onDestroy(clearWatch);
</script>

<Popup placement="left" title="Customize" maxWidth="max-w-64" contentClass="flex flex-col gap-6">
    {#snippet trigger()}
        <Button tooltip="Customize Site" class="size-12 rounded-full" size="">
            <TablerBrush class="size-6" />
        </Button>
    {/snippet}

    {#snippet children()}
        <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 text-stone-200">
                <TablerSnowflake class="size-5 text-stone-400" />
                <span class="text-sm">Snow Fall</span>
            </div>
            <Toggle bind:checked={storage.snowfall} />
        </div>

        <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 text-stone-200">
                <TablerMoon class="size-5 text-stone-400" />
                <span class="text-sm">Light Mode</span>
            </div>

            <div class="relative">
                <!-- Behind the toggle: the bear's head peeks up over the top edge -->
                <div
                    class="pointer-events-none absolute bottom-full left-1/2 flex h-28 w-16 -translate-x-1/2 items-end justify-center overflow-hidden"
                >
                    <div bind:this={bear} class="will-change-transform" style="transform: translateY(100%);">
                        <svg width="64" height="76" viewBox="0 0 64 76" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="bearFur" x1="14" y1="6" x2="50" y2="68" gradientUnits="userSpaceOnUse">
                                    <stop offset="0" stop-color="#8a5a36" />
                                    <stop offset="1" stop-color="#6b3f22" />
                                </linearGradient>
                                <filter id="bearShadow" x="-40%" y="-20%" width="180%" height="160%">
                                    <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#0c0a09" flood-opacity="0.35" />
                                </filter>
                            </defs>
                            <g filter="url(#bearShadow)">
                                <!-- shoulders / body -->
                                <ellipse cx="32" cy="66" rx="22" ry="16" fill="url(#bearFur)" />
                                <!-- ears -->
                                <circle cx="17" cy="17" r="9" fill="url(#bearFur)" />
                                <circle cx="47" cy="17" r="9" fill="url(#bearFur)" />
                                <circle cx="17" cy="17" r="4.5" fill="#a06a44" />
                                <circle cx="47" cy="17" r="4.5" fill="#a06a44" />
                                <!-- head -->
                                <circle cx="32" cy="32" r="21" fill="url(#bearFur)" />
                                <!-- muzzle -->
                                <ellipse cx="32" cy="39" rx="12" ry="9" fill="#c79a6d" />
                                <!-- nose -->
                                <ellipse cx="32" cy="35" rx="3.8" ry="2.8" fill="#2b1a10" />

                                {#if mood === "angry"}
                                    <path d="M19 24 L29 28" stroke="#2b1a10" stroke-width="2.6" stroke-linecap="round" />
                                    <path d="M45 24 L35 28" stroke="#2b1a10" stroke-width="2.6" stroke-linecap="round" />
                                    <circle cx="24" cy="31" r="2.5" fill="#2b1a10" />
                                    <circle cx="40" cy="31" r="2.5" fill="#2b1a10" />
                                    <path d="M27 44 Q32 40 37 44" stroke="#2b1a10" stroke-width="2" fill="none" stroke-linecap="round" />
                                {:else if mood === "annoyed"}
                                    <path d="M20 30 Q24 27 28 30" stroke="#2b1a10" stroke-width="2.4" fill="none" stroke-linecap="round" />
                                    <path d="M36 30 Q40 27 44 30" stroke="#2b1a10" stroke-width="2.4" fill="none" stroke-linecap="round" />
                                    <path d="M28 43 H36" stroke="#2b1a10" stroke-width="2" stroke-linecap="round" />
                                {:else}
                                    <circle cx="24" cy="29" r="2.7" fill="#2b1a10" />
                                    <circle cx="40" cy="29" r="2.7" fill="#2b1a10" />
                                    <path d="M28 42 Q32 45 36 42" stroke="#2b1a10" stroke-width="1.8" fill="none" stroke-linecap="round" />
                                {/if}
                            </g>

                            {#if curse}
                                <g>
                                    <rect x="42" y="0" width="22" height="14" rx="3.5" fill="#fafaf9" />
                                    <path d="M46 13 L43 19 L51 13 Z" fill="#fafaf9" />
                                    <text
                                        x="53"
                                        y="10.5"
                                        text-anchor="middle"
                                        font-size="7.5"
                                        font-weight="700"
                                        fill="#dc2626"
                                        font-family="sans-serif">#@$%!</text
                                    >
                                </g>
                            {/if}
                        </svg>
                    </div>
                </div>

                <Toggle bind:checked={lightMode} disabled={busy} onCheckedChange={handleLightToggle} />

                <!-- In front of the toggle: the bear's arm, hinged at a shoulder right under its body, swings down onto the knob so it always reads as one creature -->
                <div class="pointer-events-none absolute top-0 right-0 -bottom-2 left-0 overflow-hidden">
                    <div class="absolute -top-1 translate-x-5">
                        <div bind:this={paw} class="origin-top will-change-transform" style="transform: rotate(130deg);">
                            <svg width="26" height="32" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <filter id="pawShadow" x="-40%" y="-40%" width="180%" height="180%">
                                        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0c0a09" flood-opacity="0.35" />
                                    </filter>
                                </defs>
                                <g filter="url(#pawShadow)">
                                    <!-- short forearm from the shoulder -->
                                    <rect x="8" y="0" width="10" height="15" rx="5" fill="#7c4a2d" />
                                    <!-- paw -->
                                    <ellipse cx="13" cy="21" rx="9.5" ry="8.5" fill="#7c4a2d" />
                                    <!-- main pad -->
                                    <ellipse cx="13" cy="23" rx="4.2" ry="3.5" fill="#c79a6d" />
                                    <!-- toe pads -->
                                    <ellipse cx="7" cy="18" rx="1.9" ry="2.3" fill="#c79a6d" />
                                    <ellipse cx="13" cy="15.5" rx="1.9" ry="2.3" fill="#c79a6d" />
                                    <ellipse cx="19" cy="17.5" rx="1.9" ry="2.3" fill="#c79a6d" />
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/snippet}
</Popup>
