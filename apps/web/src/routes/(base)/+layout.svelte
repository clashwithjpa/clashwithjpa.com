<script lang="ts">
    import { page } from "$app/stores";
    import Navbar from "$lib/components/coc/Navbar.svelte";
    import { cn } from "$lib/utils";

    let { children } = $props();

    const isHomePage = $derived($page.url.pathname === "/");
</script>

<div class={cn("flex min-h-screen flex-col", !isHomePage && "bg-stone-950")}>
    <Navbar />

    <div class="min-h-0 flex-1 overflow-auto p-2 font-coc md:p-4">
        {@render children()}
    </div>
</div>
