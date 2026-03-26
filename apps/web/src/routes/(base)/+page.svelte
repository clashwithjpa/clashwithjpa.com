<script lang="ts">
    import CocBtn from "$lib/components/ui/coc/CocBtn.svelte";
    import H1 from "$lib/components/ui/coc/H1.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn, fadeUp, textGlide } from "$lib/utils/animations";
    import SimpleIconsAppstore from "~icons/simple-icons/appstore";
    import SimpleIconsDiscord from "~icons/simple-icons/discord";
    import SimpleIconsGoogleplay from "~icons/simple-icons/googleplay";

    let links: { name: string; href: string }[] = [
        { name: "Clans", href: "/clans" },
        { name: "War Details", href: "/wars" },
        { name: "Rules", href: "/rules" },
    ];

    $effect(() => {
        fadeIn(document.querySelector(".clash-with") as HTMLElement);
        textGlide(document.querySelector(".jpa-txt") as HTMLElement);
        fadeUp(document.querySelectorAll(".desc"));
        fadeIn(document.querySelectorAll(".nav-btn"));
        fadeIn(document.querySelectorAll(".social-btn"));
    });
</script>

<Seo
    title="Home"
    description="FWA experts in War-Farming, offering diverse clans and simultaneous 50v50 FWA wars and CWL action. Join one of the clans in our family today!"
/>

<video id="bg-video" autoplay muted loop class="absolute inset-0 -z-10 h-full w-full object-cover p-0!">
    <source src="/video/bg.mp4" type="video/mp4" />
</video>
<div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_70%,rgba(0,0,0,0.8)_100%)] p-0!"></div>

<div class="flex size-full flex-col items-center justify-between pt-20 sm:pt-0 lg:pt-20">
    <div class="flex flex-col items-center justify-center">
        <H1 class="text-4xl font-bold md:text-6xl lg:text-8xl">
            <span class="clash-with opacity-0">Clash With</span>
            <span class="jpa-txt"> JPA</span>
        </H1>
        <br />
        <p class="text-center text-sm text-stone-200 md:max-w-[50%] md:text-lg lg:max-w-[60%]">
            <span class="desc opacity-0"> FWA experts in War-Farming, </span>
            <span class="desc opacity-0"> offering diverse clans and simultaneous 50v50 FWA wars and CWL action. </span>
            <snap class="desc opacity-0"> Join one of the clans in our family today! </snap>
        </p>
    </div>
    <div class="flex flex-wrap items-center justify-center gap-4 md:hidden">
        {#each links as link}
            <CocBtn href={link.href} class="nav-btn">
                {link.name}
            </CocBtn>
        {/each}
    </div>
    <div class="flex items-center justify-center gap-4">
        <CocBtn variant="green" size="sm" class="social-btn">
            <SimpleIconsGoogleplay />
        </CocBtn>
        <CocBtn variant="orange" size="sm" class="social-btn">
            <SimpleIconsAppstore />
        </CocBtn>
        <CocBtn variant="blurple" size="sm" class="social-btn">
            <SimpleIconsDiscord />
        </CocBtn>
    </div>
</div>
