<script lang="ts">
    import { cn } from "$lib/utils";
    import { onMount } from "svelte";
    import { clockEvents, countdown } from "../cocClock";

    let now = $state(new Date());
    let events = $derived(clockEvents(now));

    onMount(() => {
        const timer = setInterval(() => (now = new Date()), 30_000);
        return () => clearInterval(timer);
    });

    const local = (d: Date) => d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
</script>

<ul class="flex flex-col">
    {#each events as event (event.name)}
        <li class="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5" title={local(event.at)}>
            <span class="flex items-center gap-2 text-sm text-stone-200">
                <span class={cn("size-1.5 rounded-full", event.active ? "bg-lime-400" : "bg-stone-600")}></span>
                {event.name}
            </span>
            <span class="text-xs whitespace-nowrap text-stone-400">
                {event.active ? "ends in" : "in"} <span class="font-medium text-stone-100 tabular-nums">{countdown(event.at, now)}</span>
            </span>
        </li>
    {/each}
</ul>
