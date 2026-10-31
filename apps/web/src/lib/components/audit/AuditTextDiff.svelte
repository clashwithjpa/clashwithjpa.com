<script lang="ts">
    import { cn } from "#lib/utils.js";

    type Hunk = { oldStart: number; oldLines: number; newStart: number; newLines: number; lines: string[] };

    let { hunks, truncated = false }: { hunks: Hunk[]; truncated?: boolean } = $props();
</script>

<div class="overflow-hidden rounded-lg border-2 border-stone-700/50 font-mono text-xs">
    {#each hunks as hunk, h (h)}
        <div class="bg-stone-800 px-3 py-1 text-stone-500">@@ −{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@</div>
        {#each hunk.lines as line, i (i)}
            {@const sign = line[0]}
            <div
                class={cn(
                    "flex gap-2 px-3 py-px whitespace-pre-wrap",
                    sign === "+" && "bg-green-950/50 text-green-200",
                    sign === "-" && "bg-red-950/50 text-red-200",
                    sign !== "+" && sign !== "-" && "text-stone-400",
                )}
            >
                <span class="w-2 shrink-0 select-none">{sign === " " ? "" : sign}</span>
                <span class="min-w-0 wrap-break-word">{line.slice(1) || " "}</span>
            </div>
        {/each}
    {/each}
    {#if truncated}
        <div class="bg-stone-800 px-3 py-1.5 text-stone-400">Diff truncated. Very large edits keep only the first few hundred lines.</div>
    {/if}
</div>
