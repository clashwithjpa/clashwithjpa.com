<script lang="ts">
    import { cn } from "$lib/utils/cn";
    import type { Snippet } from "svelte";

    interface Props {
        class?: string;
        type?: "button" | "submit" | "reset";
        disabled?: boolean;
        size?: "sm" | "md" | "lg" | "xl" | "";
        onclick?: () => void;
        children?: Snippet;
    }

    let { class: className = "", type = "button", disabled = $bindable(false), size = "", onclick = () => {}, children }: Props = $props();

    let sizeClass: string = $derived.by(() => {
        switch (size) {
            case "sm":
                return "text-base px-2 py-1 lg:px-3 lg:py-2";
            case "md":
                return "text-lg px-4 py-2 lg:px-5 lg:py-3";
            case "lg":
                return "text-xl px-4 py-3 lg:px-6 lg:py-4";
            case "xl":
                return "text-2xl px-6 py-4 lg:px-8 lg:py-5";
            default:
                return "";
        }
    });
</script>

<button
    class={cn(
        `z-10 cursor-pointer rounded-lg bg-gray-800 transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-800`,
        sizeClass,
        className
    )}
    {type}
    {disabled}
    {onclick}
>
    {@render children?.()}
</button>
