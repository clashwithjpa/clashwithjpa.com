<script lang="ts">
    import { page } from "$app/state";
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    interface Props {
        href?: string | null;
        class?: string;
        newTab?: boolean;
        onclick?: () => void;
        children: Snippet;
    }
    let { href = null, class: className = "", newTab = false, onclick = () => {}, children }: Props = $props();

    function getClass(pathname: string, href: string | null): string {
        const baseClass =
            "relative text-base after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-full after:bg-stone-50 after:transition-transform after:duration-300 after:ease-in-out after:will-change-transform";
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
    class={cn(getClass(page.url.pathname, href), "group flex items-center space-x-1 transition-all duration-300 ease-in-out", className)}
    {onclick}
    data-sveltekit-preload-data="hover"
>
    {@render children?.()}
</svelte:element>
