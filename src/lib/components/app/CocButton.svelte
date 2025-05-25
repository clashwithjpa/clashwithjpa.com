<script lang="ts">
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";
    import P from "./P.svelte";

    interface Props {
        class?: string;
        type?: "success" | "danger" | "normal";
        size?: "sm" | "md" | "lg" | "xl" | "";
        href?: string;
        disabled?: boolean;
        onclick?: () => void;
        children?: Snippet;
    }

    let { class: className = "", type = "normal", size = "md", href = "", disabled = false, onclick = () => {}, children }: Props = $props();

    let sizeClass: string = $derived.by(() => {
        switch (size) {
            case "sm":
                return "text-base px-2 py-1 lg:px-3 lg:py-2 rounded-lg";
            case "md":
                return "text-lg px-4 py-2 lg:px-5 lg:py-3 rounded-xl";
            case "lg":
                return "text-xl px-4 py-3 lg:px-6 lg:py-4 rounded-2xl";
            case "xl":
                return "text-2xl px-6 py-4 lg:px-8 lg:py-5 rounded-3xl";
            default:
                return "";
        }
    });

    let typeClass: string = $derived.by(() => {
        switch (type) {
            case "success":
                return "from-lime-200 via-lime-600 to-lime-600";
            case "danger":
                return "from-red-300 via-red-600 to-red-600";
            case "normal":
                return "from-yellow-400 via-orange-600 to-orange-600";
            default:
                return "";
        }
    });
</script>

<svelte:element
    this={href ? "a" : "button"}
    role={href ? "link" : "button"}
    tabindex="0"
    class={cn(
        "font-coc flex cursor-pointer items-center justify-center bg-linear-to-b shadow-[0_0_0_2px_#F3F4F6,0_1px_0_5px_#030712,0_6px_0_5px_#0006] transition-all not-disabled:hover:brightness-110 active:translate-y-[2px] active:shadow-[0_0_0_2px_#F3F4F6,0_1px_0_5px_#030712,0_0px_0_5px_#0006] disabled:cursor-not-allowed disabled:opacity-50",
        sizeClass,
        typeClass,
        className
    )}
    {onclick}
    {href}
    {disabled}
    data-sveltekit-preload-data="hover"
>
    <P>
        {@render children?.()}
    </P>
</svelte:element>
