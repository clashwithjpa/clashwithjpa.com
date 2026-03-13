<script lang="ts">
    import { fadeUp, wavyBounce } from "$lib/utils/animations";
    import CocBtn from "./ui/CocBtn.svelte";
    import Link from "./ui/Link.svelte";

    let links: { name: string; href: string }[] = [
        { name: "Home", href: "/" },
        { name: "Clans", href: "/clans" },
        { name: "War Details", href: "/wars" },
        { name: "Rules", href: "/rules" },
    ];

    let logo: HTMLElement;
    let menuOpen = $state(false);

    $effect(() => {
        fadeUp(document.querySelectorAll(".animate-desktop"));
        wavyBounce(logo);
    });
</script>

<nav class="sticky top-0 z-40 flex items-center justify-between p-4 transition-all duration-200 md:p-6" class:backdrop-blur-md={menuOpen}>
    <a href="/" class="flex h-10 items-center gap-4">
        <div class="size-10 bg-cover" style="background-image: url('/logo.webp');" bind:this={logo}></div>
        <div class="h-full border-l-2 border-stone-700/50"></div>
        <div class="flex flex-col">
            <span class="text-xl font-bold">JPA</span>
            <span class="text-xs text-stone-400">FWA Clans</span>
        </div>
    </a>

    <!-- Desktop nav links -->
    <div class="hidden **:text-sm md:absolute md:left-1/2 md:flex md:-translate-x-1/2 md:items-center md:gap-8">
        {#each links as link}
            <Link href={link.href} class="animate-desktop opacity-0">
                {link.name}
            </Link>
        {/each}
    </div>

    <CocBtn variant="orange" size="xs">Login</CocBtn>
</nav>
