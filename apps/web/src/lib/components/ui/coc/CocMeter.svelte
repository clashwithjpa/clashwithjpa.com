<script lang="ts">
    import { cn } from "#lib/utils.js";

    let {
        value,
        max,
        text,
        label,
        tone = "green",
        class: className = "",
    }: {
        value: number;
        max: number;
        text: string;
        label: string;
        tone?: "green" | "orange" | "red" | "blurple";
        class?: string;
    } = $props();

    const tones = {
        green: "from-[#a6dc5a] to-[#4f961d]",
        orange: "from-[#ffcd6a] to-[#d97a1e]",
        red: "from-[#ff8a75] to-[#c22a1a]",
        // The opponent's side, matching the war log's blurple; red stays for losses.
        blurple: "from-[#a5acf8] to-[#4754e0]",
    };

    const pct = $derived(max > 0 ? Math.min(Math.max(value / max, 0), 1) * 100 : 0);
</script>

<div
    class={cn("relative h-7 overflow-hidden rounded-lg border-2 border-black bg-[#2a1609] shadow-[inset_0_2px_3px_rgba(0,0,0,0.6)]", className)}
    role="meter"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={max}
    aria-valuenow={value}
>
    <div
        class={cn("absolute inset-y-0 left-0 rounded-r-md bg-linear-to-b shadow-[inset_0_2px_0_rgba(255,255,255,0.35)]", tones[tone])}
        style="width: {pct}%"
    ></div>
    <span class="relative flex h-full items-center justify-center font-coc text-sm font-bold whitespace-nowrap text-white text-outline">{text}</span>
</div>
