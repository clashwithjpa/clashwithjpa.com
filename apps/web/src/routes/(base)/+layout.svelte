<script lang="ts">
    import { page } from "$app/state";
    import Footer from "$lib/components/coc/Footer.svelte";
    import Navbar from "$lib/components/coc/Navbar.svelte";
    import { cn } from "$lib/utils";

    let { children } = $props();

    const isHomePage = $derived(page.url.pathname === "/");
</script>

<div class={cn("flex min-h-screen w-full flex-col pt-20", !isHomePage && "bg-stone-950")}>
    <Navbar />

    <div class="w-full grow px-2 font-coc *:py-4 md:px-4 *:md:py-8 lg:px-8 *:lg:py-12">
        {@render children()}
    </div>

    <Footer />
</div>
