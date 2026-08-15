<script lang="ts">
    import { LINKS } from "$lib/utils/links";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import Link from "../ui/Link.svelte";

    let links: { name: string; href: string }[] = [
        { name: "Home", href: "/" },
        { name: "Clans", href: "/clans" },
        { name: "War Details", href: "/wars" },
        { name: "Rules", href: "/rules" },
    ];

    const year = new Date().getFullYear();
</script>

<footer class="w-full border-t border-stone-700/50 bg-stone-950/50 font-coc backdrop-blur-sm">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <a href="/" class="flex h-12 items-center gap-4">
                <div class="size-12 bg-contain bg-center bg-no-repeat" style="background-image: url('/logo.webp');"></div>
                <div class="h-full border-l-2 border-stone-700/50"></div>
                <div class="flex flex-col">
                    <span class="text-xl font-bold">JPA</span>
                    <span class="text-xs text-stone-400">FWA Clans</span>
                </div>
            </a>

            <div class="flex flex-wrap items-center gap-x-8 gap-y-3 **:text-sm">
                {#each links as link (link.href)}
                    <Link href={link.href}>{link.name}</Link>
                {/each}
            </div>
        </div>

        <div class="flex flex-col-reverse items-center gap-4 border-t border-stone-700/50 pt-6 text-stone-400 md:flex-row md:justify-between">
            <span class="text-xs">© {year} Team JPA. Not affiliated with Supercell.</span>

            <div class="flex items-center gap-6 **:text-xs">
                <Link href="/privacy">Privacy</Link>
                <a
                    href={LINKS.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Join our Discord"
                    class="press transition-colors hover:text-stone-50"
                >
                    <SimpleIconsDiscord class="size-5" />
                </a>
            </div>
        </div>
    </div>
</footer>
