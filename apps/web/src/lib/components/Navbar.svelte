<script lang="ts">
    import Link from "./ui/Link.svelte";

    let links: { name: string; href: string }[] = [
        { name: "Home", href: "/" },
        { name: "Clans", href: "/clans" },
        { name: "War Details", href: "/wars" },
        { name: "CWL List", href: "/cwl-list" },
        { name: "Rules", href: "/rules" },
    ];
</script>

<nav class="sticky top-0 flex items-center justify-between p-4 md:p-6">
    <a href="/" class="flex h-10 items-center gap-4">
        <img src="/logo.webp" alt="Logo" class="size-10" />
        <div class="h-full border border-l border-stone-500"></div>
        <div class="flex flex-col">
            <span class="text-xl font-bold">JPA</span>
            <span class="text-xs text-stone-500">FWA Clans</span>
        </div>
    </a>
    <div class="absolute left-1/2 flex -translate-x-1/2 items-center gap-8 **:text-sm">
        {#each links as link}
            <Link href={link.href}>
                {link.name}
            </Link>
        {/each}
    </div>
    <div class="flex items-center gap-4 **:text-sm">Login</div>
</nav>
