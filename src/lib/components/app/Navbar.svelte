<script lang="ts">
    import type { UserData } from "$lib/auth/user";
    import InlineLink from "$lib/components/app/InlineLink.svelte";
    import UserButton from "$lib/components/app/UserButton.svelte";
    import { Button } from "$lib/components/ui/button";
    import type { InsertCoc, InsertUser } from "$lib/server/schema";
    import { fade, slide } from "svelte/transition";
    import AkarIconsCross from "~icons/akar-icons/cross";
    import AkarIconsThreeLineHorizontal from "~icons/akar-icons/three-line-horizontal";
    import SpecialButton from "./SpecialButton.svelte";

    interface Item {
        name: string;
        href: string;
        newTab?: boolean;
    }
    const items: Item[] = [
        { name: "Home", href: "/" },
        { name: "Clans", href: "/clans" },
        { name: "War details", href: "/wars" },
        { name: "Rules", href: "/clans/rules" },
        { name: "Discord", href: "https://discord.clashwithjpa.com", newTab: true }
    ];

    let {
        user,
        applicationEnabled,
        cwlEnabled,
        hasCWLApplications,
        cocAccs
    }: {
        user: UserData | null;
        applicationEnabled: boolean;
        cwlEnabled: boolean;
        hasCWLApplications: boolean;
        cocAccs: (InsertUser & { cocAccounts: InsertCoc[] }) | undefined;
    } = $props();

    let isOpen = $state(false);
    function toggleMenu() {
        isOpen = !isOpen;
    }
</script>

<nav
    class="font-coc fixed top-0 z-40 flex max-h-screen w-full flex-col items-center p-4 px-6 backdrop-blur-xs transition-all md:px-12 lg:px-28"
    class:rounded-b-2xl={!isOpen}
    class:!backdrop-blur-md={isOpen}
>
    <div class="flex w-full items-center justify-between">
        <a href="/" class="flex items-center justify-center space-x-1" data-sveltekit-preload-data="hover">
            <img src="/logo.webp" alt="Logo" class="size-12" />
            <p class="text-2xl">JPA</p>
        </a>
        <div class="flex items-center justify-center space-x-4 md:hidden">
            <UserButton {user} {applicationEnabled} {cwlEnabled} {hasCWLApplications} {cocAccs} />
            <Button variant="ghost" size="icon" class="![&_svg]:size-10" onclick={toggleMenu}>
                {#if isOpen}
                    <span in:fade={{ duration: 100 }} class="size-6">
                        <AkarIconsCross class="size-full" />
                    </span>
                {:else}
                    <span in:fade={{ duration: 100 }} class="size-6">
                        <AkarIconsThreeLineHorizontal class="size-full" />
                    </span>
                {/if}
            </Button>
        </div>
        <div class="hidden items-center justify-center gap-4 md:flex">
            {#each items as item}
                {@const Component = item.name === "Discord" ? SpecialButton : InlineLink}
                <Component href={item.href} newTab={item.newTab}>
                    {item.name}
                </Component>
            {/each}
            <UserButton {user} {applicationEnabled} {cwlEnabled} {hasCWLApplications} {cocAccs} />
        </div>
    </div>
    {#if isOpen}
        <div transition:slide class="flex size-full h-screen items-center justify-center md:hidden">
            <div class="flex flex-col items-center justify-center gap-4 p-4">
                {#each items as item}
                    {@const Component = item.name === "Discord" ? SpecialButton : InlineLink}
                    <Component
                        href={item.href}
                        newTab={item.newTab}
                        class="text-xl"
                        onclick={() => {
                            toggleMenu();
                        }}
                    >
                        {item.name}
                    </Component>
                {/each}
            </div>
        </div>
    {/if}
</nav>
