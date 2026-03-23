<script lang="ts">
    import { page } from "$app/state";
    import Navbar from "$lib/components/coc/Navbar.svelte";
    import { cn } from "$lib/utils";

    let { children } = $props();

    const isHomePage = $derived(page.url.pathname === "/");
</script>

<div class={cn("min-h-screen", !isHomePage && "bg-stone-950")}>
    <Navbar />

    <div class="size-full p-2 pt-20 font-coc md:p-4 md:pt-20">
        {@render children()}
    </div>
</div>
