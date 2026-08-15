<script lang="ts">
    import { LINKS } from "$lib/utils/links";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import Link from "../ui/Link.svelte";

    const year = new Date().getFullYear();
</script>

<footer class="w-full border-t border-stone-700/50 bg-stone-950/50 font-coc backdrop-blur-sm">
    <div
        class="mx-auto flex w-full max-w-6xl flex-col-reverse items-center gap-4 px-4 py-6 text-stone-400 md:flex-row md:justify-between md:px-8 md:py-8"
    >
        <span class="text-xs">© {year} JPA. Not affiliated with Supercell.</span>

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
</footer>
