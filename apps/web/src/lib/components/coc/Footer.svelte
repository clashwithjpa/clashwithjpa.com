<script lang="ts">
    import { LINKS } from "$lib/utils/links";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import Link from "../ui/Link.svelte";

    const year = new Date().getFullYear();
</script>

<footer class="w-full border-t border-stone-700/50 bg-stone-950 font-coc backdrop-blur-sm">
    <div
        class="mx-auto flex w-full max-w-6xl flex-col-reverse items-center gap-4 px-4 py-6 text-stone-400 md:flex-row md:justify-between md:px-8 md:py-8"
    >
        <div class="flex flex-col items-center gap-1 text-center text-xs md:items-start md:text-left">
            <span>© {year} JPA</span>
            <span class="max-w-xl text-stone-500">
                This material is unofficial and is not endorsed by Supercell. For more information see
                <a
                    href="https://supercell.com/en/fan-content-policy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline hover:text-stone-300">Supercell's Fan Content Policy</a
                >.
            </span>
        </div>

        <div class="flex items-center gap-6 **:text-xs">
            <Link href="/privacy" class="after:bg-stone-400">Privacy</Link>
            <a
                href={LINKS.discord}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join our Discord"
                class="press transition-colors hover:text-stone-50"
            >
                <SimpleIconsDiscord class="size-6" />
            </a>
        </div>
    </div>
</footer>
