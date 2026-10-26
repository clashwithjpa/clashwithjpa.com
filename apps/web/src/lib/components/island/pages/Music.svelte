<script lang="ts">
    import { cn } from "#lib/utils.js";
    import { Slider } from "@ark-ui/svelte/slider";
    import { onMount } from "svelte";
    import TablerArrowsShuffle from "~icons/tabler/arrows-shuffle";
    import TablerExternalLink from "~icons/tabler/external-link";
    import TablerPlayerPauseFilled from "~icons/tabler/player-pause-filled";
    import TablerPlayerPlayFilled from "~icons/tabler/player-play-filled";
    import TablerPlayerSkipBackFilled from "~icons/tabler/player-skip-back-filled";
    import TablerPlayerSkipForwardFilled from "~icons/tabler/player-skip-forward-filled";
    import TablerPlayerTrackNext from "~icons/tabler/player-track-next";
    import TablerRepeatOnce from "~icons/tabler/repeat-once";
    import { player } from "../music/player.svelte";
    import { TRACKS } from "../music/tracks";

    onMount(() => player.prepare());

    // While dragging, the thumb follows the pointer instead of the playing audio.
    let dragging = $state<number | null>(null);
    let shown = $derived(dragging ?? player.time);

    const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
    const control = "grid size-9 cursor-pointer place-items-center rounded-full text-stone-200 transition-colors hover:bg-stone-800";
    const MODES = [
        { key: "shuffle", label: "Shuffle", icon: TablerArrowsShuffle },
        { key: "autoplay", label: "Autoplay next", icon: TablerPlayerTrackNext },
        { key: "repeatOne", label: "Repeat one", icon: TablerRepeatOnce },
    ] as const;
</script>

<div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1 rounded-2xl bg-stone-800/50 px-3 pt-2 pb-2.5">
        <div class="flex items-center gap-3">
            <div class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-sm font-medium text-stone-50">{player.current.title}</span>
                <span class="truncate text-xs text-stone-400">{player.current.artist}</span>
            </div>
            <button type="button" class={control} aria-label="Previous track" onclick={() => player.skip(-1)}>
                <TablerPlayerSkipBackFilled class="size-4" />
            </button>
            <button
                type="button"
                class={cn(control, "bg-stone-100 text-stone-900 hover:bg-white")}
                aria-label={player.playing ? "Pause" : "Play"}
                onclick={() => player.toggle()}
            >
                {#if player.playing}
                    <TablerPlayerPauseFilled class="size-4" />
                {:else}
                    <TablerPlayerPlayFilled class="size-4" />
                {/if}
            </button>
            <button type="button" class={control} aria-label="Next track" onclick={() => player.skip(1)}>
                <TablerPlayerSkipForwardFilled class="size-4" />
            </button>
        </div>

        <Slider.Root
            class="flex flex-col"
            min={0}
            max={Math.max(player.duration, 1)}
            step={1}
            value={[Math.min(shown, player.duration)]}
            disabled={!player.duration}
            aria-label={["Seek"]}
            onValueChange={(d) => (dragging = d.value[0] ?? null)}
            onValueChangeEnd={(d) => {
                player.seek(d.value[0] ?? 0);
                dragging = null;
            }}
        >
            <Slider.Control class="relative flex h-4 items-center">
                <Slider.Track class="h-1 w-full rounded-full bg-stone-700">
                    <Slider.Range class="h-full rounded-full bg-lime-400" />
                </Slider.Track>
                <Slider.Thumb
                    index={0}
                    class="size-3 cursor-grab rounded-full bg-stone-50 shadow outline-none focus-visible:ring-4 focus-visible:ring-stone-700/50 data-disabled:hidden data-dragging:cursor-grabbing"
                >
                    <Slider.HiddenInput />
                </Slider.Thumb>
            </Slider.Control>
            <div class="flex items-center justify-between text-[11px] text-stone-500 tabular-nums">
                <span class="w-8">{clock(shown)}</span>
                <div class="flex items-center gap-1">
                    {#each MODES as mode (mode.key)}
                        <button
                            type="button"
                            class={cn(
                                "grid size-7 cursor-pointer place-items-center rounded-full transition-colors hover:bg-stone-800",
                                player[mode.key] ? "text-lime-300" : "text-stone-500 hover:text-stone-300",
                            )}
                            title={mode.label}
                            aria-label={mode.label}
                            aria-pressed={player[mode.key]}
                            onclick={() => (player[mode.key] = !player[mode.key])}
                        >
                            <mode.icon class="size-4" />
                        </button>
                    {/each}
                </div>
                <span class="w-8 text-right">{player.duration ? clock(player.duration) : "--:--"}</span>
            </div>
        </Slider.Root>
    </div>

    <ul class="flex max-h-56 [scrollbar-width:none] flex-col overflow-y-auto overscroll-contain">
        {#each TRACKS as track (track.id)}
            {@const active = track.id === player.current.id}
            <li>
                <button
                    type="button"
                    class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-stone-800"
                    onclick={() => player.toggle(track)}
                >
                    <span class="flex min-w-0 flex-col">
                        <span class={cn("truncate text-sm", active ? "text-lime-300" : "text-stone-200")}>{track.title}</span>
                        <span class="truncate text-[11px] text-stone-500">{track.artist}</span>
                    </span>
                    <span class="shrink-0 text-stone-500">
                        {#if track.href}
                            <TablerExternalLink class="size-3.5" />
                        {:else if active && player.playing}
                            <TablerPlayerPauseFilled class="size-3.5 text-lime-300" />
                        {:else}
                            <TablerPlayerPlayFilled class="size-3.5" />
                        {/if}
                    </span>
                </button>
            </li>
        {/each}
    </ul>

    <p class="px-2 text-[11px] leading-snug text-stone-500">
        Supercell fan kit tracks are used under Supercell's
        <a href="https://supercell.com/en/fan-content-policy/" target="_blank" rel="noopener noreferrer" class="underline hover:text-stone-300"
            >Fan Content Policy</a
        >. Tracks by Kevin MacLeod are from
        <a href="https://incompetech.com" target="_blank" rel="noopener noreferrer" class="underline hover:text-stone-300">incompetech.com</a>
        and licensed under
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" class="underline hover:text-stone-300"
            >CC BY 4.0</a
        >.
    </p>
</div>
