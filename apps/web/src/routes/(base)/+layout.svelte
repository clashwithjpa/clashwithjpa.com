<script lang="ts">
    import { page } from "$app/state";
    import Navbar from "$lib/components/coc/Navbar.svelte";
    import { cn } from "$lib/utils";

    let { children } = $props();

    const isHomePage = $derived(page.url.pathname === "/");
</script>

<div class={cn("min-h-screen pt-20", !isHomePage && "bg-stone-950")}>
    <Navbar />

    <div class="size-full p-2 font-coc md:p-4">
        {@render children()}
    </div>
</div>
