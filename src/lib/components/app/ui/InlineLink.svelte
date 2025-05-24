<script lang="ts">
    import { page } from "$app/state";
    import { cn } from "$lib/utils/cn";
    import type { Snippet } from "svelte";
    import PhArrowUpRightBold from "~icons/ph/arrow-up-right-bold";

    interface Props {
        href?: string | null;
        class?: string;
        arrow?: boolean;
        newTab?: boolean;
        onclick?: () => void;
        children: Snippet;
    }
    let { href = null, class: className = "", arrow = false, newTab = false, onclick = () => {}, children }: Props = $props();

    function getClass(pathname: string, href: string | null): string {
        const baseClass =
            "relative text-base after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-50 after:transition-transform after:duration-300 after:ease-in-out";
        const activeClass = "after:origin-bottom-left after:scale-x-100 hover:after:origin-bottom-right hover:after:scale-x-0";
        const inactiveClass = "after:origin-bottom-right after:scale-x-0 hover:after:origin-bottom-left hover:after:scale-x-100";
        return `${baseClass} ${pathname === (href || "") ? activeClass : inactiveClass}`;
    }
</script>

<svelte:element
    this={href ? "a" : "div"}
    role={href ? "link" : "button"}
    tabindex={0}
    {href}
    target={newTab ? "_blank" : ""}
    class={cn(getClass(page.url.pathname, href), "group flex items-center space-x-1 text-sm transition-all duration-300 ease-in-out", className)}
    {onclick}
    data-sveltekit-preload-data="hover"
>
    {@render children?.()}
    {#if arrow}
        <PhArrowUpRightBold class="size-fit transition-transform group-hover:translate-x-2 group-hover:-translate-y-1" />
    {/if}
</svelte:element>
