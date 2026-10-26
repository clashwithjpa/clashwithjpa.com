<script lang="ts">
    import Toggle from "#lib/components/ui/Toggle.svelte";
    import { storage } from "#lib/utils/storage.svelte.js";
    import { onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import TablerMoodWink from "~icons/tabler/mood-wink";
    import TablerMoon from "~icons/tabler/moon";
    import TablerSnowflake from "~icons/tabler/snowflake";

    // A "useless box" cat: turning light mode on summons a paw from the island's
    // edge that pushes the switch back off. It gets grumpier the more you try.
    let lightMode = $state(false);
    let busy = false;
    let attempts = 0;
    let calmTimer: ReturnType<typeof setTimeout> | undefined;
    let mood = $state<"curious" | "squint" | "angry">("curious");
    let hiss = $state(false);
    let arm = $state<HTMLElement>();
    let head = $state<HTMLElement>();

    // Paw tip offsets (px) from the knob's right edge while it's on. The Toggle
    // knob travels 20px, so PUSH lands it exactly on the off position.
    const ARM = { hidden: 52, near: 7, touch: 0, push: -20 };
    const HEAD = { hidden: "translateX(110%) rotate(0deg)", peek: "translateX(44%) rotate(-16deg)" };
    const EASE = {
        out: "cubic-bezier(0.33, 1, 0.68, 1)",
        in: "cubic-bezier(0.32, 0, 0.67, 0)",
        inOut: "cubic-bezier(0.45, 0, 0.55, 1)",
    };

    const armAt = (x: number, y = 0) => ({ transform: `translate(${x}px, ${y}px)` });
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // eslint-disable-next-line no-undef -- Keyframe and KeyframeAnimationOptions are DOM lib types
    async function play(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
        const anim = el.animate(keyframes, { fill: "forwards", ...options });
        await anim.finished;
        try {
            anim.commitStyles();
        } finally {
            anim.cancel();
        }
    }

    async function swat(checked: boolean) {
        if (!checked) return;
        // The paw is already on the switch, so it just doesn't budge.
        if (busy || !arm || !head || matchMedia("(prefers-reduced-motion: reduce)").matches) {
            lightMode = false;
            return;
        }
        busy = true;
        attempts += 1;
        clearTimeout(calmTimer);
        mood = attempts >= 6 ? "angry" : attempts >= 4 ? "squint" : "curious";
        const peeks = attempts >= 4;

        try {
            if (peeks) {
                await play(head, [{ transform: HEAD.peek }], { duration: 260, easing: EASE.out });
                await wait(mood === "angry" ? 80 : 260);
            }

            if (attempts === 1) {
                // First time: a couple of curious taps before committing.
                await play(arm, [armAt(ARM.near)], { duration: 340, easing: EASE.out });
                await wait(200);
                await play(arm, [armAt(ARM.touch), armAt(ARM.near), armAt(ARM.touch), armAt(ARM.near + 2)], {
                    duration: 520,
                    easing: EASE.inOut,
                });
                await wait(160);
                await play(arm, [armAt(ARM.touch)], { duration: 90, easing: EASE.out });
            } else {
                await play(arm, [armAt(ARM.touch)], { duration: mood === "angry" ? 130 : 220, easing: EASE.out });
            }

            // Matches the Toggle knob's own 200ms slide, so the paw carries it.
            lightMode = false;
            await play(arm, [armAt(ARM.push)], { duration: 200, easing: EASE.inOut });

            if (mood === "angry") {
                hiss = true;
                await wait(1800);
                hiss = false;
            } else if (attempts >= 2) {
                // "No no no."
                await play(arm, [armAt(ARM.push), armAt(ARM.push, -3), armAt(ARM.push, 3), armAt(ARM.push, -3), armAt(ARM.push, 0)], {
                    duration: 420,
                    easing: EASE.inOut,
                });
            } else {
                await wait(240);
            }

            await play(arm, [armAt(ARM.hidden)], { duration: 300, easing: EASE.in });
            if (peeks) await play(head, [{ transform: HEAD.hidden }], { duration: 240, easing: EASE.in });
        } finally {
            busy = false;
            calmTimer = setTimeout(() => {
                attempts = 0;
                mood = "curious";
            }, 15_000);
        }
    }

    onDestroy(() => clearTimeout(calmTimer));
</script>

<div class="flex flex-col gap-4 px-2 pb-1">
    <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-stone-200">
            <TablerSnowflake class="size-5 text-stone-400" />
            <span class="text-sm">Snow Fall</span>
        </div>
        <Toggle bind:checked={storage.snowfall} />
    </div>

    <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-stone-200">
            <TablerMoodWink class="size-5 text-stone-400" />
            <span class="text-sm">Surprises</span>
        </div>
        <Toggle bind:checked={storage.islandEggs} />
    </div>

    <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-stone-200">
            <TablerMoon class="size-5 text-stone-400" />
            <span class="text-sm">Light Mode</span>
        </div>

        <div class="relative">
            <Toggle bind:checked={lightMode} onCheckedChange={swat} />

            {#if hiss}
                <span
                    class="pointer-events-none absolute right-0 bottom-full mb-1.5 rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600"
                    transition:fade={{ duration: 120 }}
                >
                    hiss!
                </span>
            {/if}

            <!-- Head peeks round the island's right edge, which sits 20px past the toggle. -->
            <div class="pointer-events-none absolute -right-5 bottom-1/2 size-10">
                <div bind:this={head} class="size-full origin-bottom-right" style:transform={HEAD.hidden}>
                    <svg viewBox="0 0 48 48" class="size-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 22 L9 3 L22 13 Z" fill="#f59e42" stroke="#9a4d12" stroke-width="1.2" stroke-linejoin="round" />
                        <path d="M41 22 L39 3 L26 13 Z" fill="#f59e42" stroke="#9a4d12" stroke-width="1.2" stroke-linejoin="round" />
                        <path d="M10.5 15 L11.5 7.5 L17 12 Z" fill="#f4a7b9" />
                        <path d="M37.5 15 L36.5 7.5 L31 12 Z" fill="#f4a7b9" />
                        <ellipse cx="24" cy="28" rx="19" ry="16" fill="#f59e42" stroke="#9a4d12" stroke-width="1.2" />
                        <path d="M20 14 q1 4 0 7 M24 13 q1 4 0 8 M28 14 q1 4 0 7" stroke="#c2621b" stroke-width="1.8" stroke-linecap="round" />
                        {#if mood === "angry"}
                            <path d="M12 21 L20 24 M36 21 L28 24" stroke="#3b1d0d" stroke-width="2" stroke-linecap="round" />
                            <circle cx="17" cy="27" r="3.4" fill="#d9f99d" />
                            <circle cx="31" cy="27" r="3.4" fill="#d9f99d" />
                            <ellipse cx="17" cy="27" rx="1" ry="3" fill="#1c1917" />
                            <ellipse cx="31" cy="27" rx="1" ry="3" fill="#1c1917" />
                        {:else if mood === "squint"}
                            <path d="M13.5 27 Q17 24.5 20.5 27 M27.5 27 Q31 24.5 34.5 27" stroke="#1c1917" stroke-width="2" stroke-linecap="round" />
                        {:else}
                            <circle cx="17" cy="27" r="3.4" fill="#1c1917" />
                            <circle cx="31" cy="27" r="3.4" fill="#1c1917" />
                            <circle cx="18.2" cy="25.8" r="1.1" fill="#fff" />
                            <circle cx="32.2" cy="25.8" r="1.1" fill="#fff" />
                        {/if}
                        <path d="M22.5 32 h3 l-1.5 2 z" fill="#f4a7b9" />
                        <path d="M24 34 q-1.5 2 -3.5 1 M24 34 q1.5 2 3.5 1" stroke="#3b1d0d" stroke-width="1.1" stroke-linecap="round" />
                        <path
                            d="M12 32 L2 30 M12 34.5 L2 35.5 M36 32 L46 30 M36 34.5 L46 35.5"
                            stroke="#fde7d0"
                            stroke-width="0.8"
                            stroke-linecap="round"
                        />
                    </svg>
                </div>
            </div>

            <!-- The arm starts at the knob's right edge (40px in) and reaches in from off the island. -->
            <div class="pointer-events-none absolute top-1/2 left-10 h-5.5 w-37.5 -translate-y-1/2">
                <div bind:this={arm} class="size-full" style:transform="translate({ARM.hidden}px, 0px)">
                    <svg viewBox="0 0 150 22" class="size-full overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <filter id="catPawShadow" x="-20%" y="-60%" width="140%" height="220%">
                                <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#0c0a09" flood-opacity="0.5" />
                            </filter>
                        </defs>
                        <g filter="url(#catPawShadow)">
                            <rect x="12" y="6" width="150" height="10" rx="5" fill="#f59e42" stroke="#9a4d12" stroke-width="0.9" />
                            <path
                                d="M34 6.6 q1.5 4.4 0 8.8 M46 6.6 q1.5 4.4 0 8.8 M58 6.6 q1.5 4.4 0 8.8"
                                stroke="#c2621b"
                                stroke-width="2"
                                stroke-linecap="round"
                            />
                            <!-- white sock, seen from above, toes pointing left -->
                            <path
                                d="M20 5.5 C14 3 4 3.5 1.5 7.5 C0 9.8 0 12.2 1.5 14.5 C4 18.5 14 19 20 16.5 Z"
                                fill="#fff7ed"
                                stroke="#9a4d12"
                                stroke-width="0.9"
                                stroke-linejoin="round"
                            />
                            <path
                                d="M2.2 8.6 q2.6 .4 4.6 1.6 M1.6 11 h5 M2.2 13.4 q2.6 -.4 4.6 -1.6"
                                stroke="#b08968"
                                stroke-width="0.8"
                                stroke-linecap="round"
                            />
                            {#if mood === "angry"}
                                <path
                                    d="M1.8 7.6 l-2.6 -0.6 l2.1 1.7 M0.6 10.4 l-2.6 0.6 l2.6 0.6 M1.8 14.4 l-2.6 0.6 l2.1 -1.7"
                                    fill="#fafaf9"
                                    stroke="#fafaf9"
                                    stroke-width="0.6"
                                    stroke-linejoin="round"
                                />
                            {/if}
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    </div>
</div>
