<script lang="ts">
    import { page } from "$app/state";
    import InlineLink from "$lib/components/InlineLink.svelte";
    import UserButton from "$lib/components/UserButton.svelte";
    import type { APIUser } from "discord-api-types/v10";
    import { slide } from "svelte/transition";
    import AkarIconsCross from "~icons/akar-icons/cross";
    import AkarIconsThreeLineHorizontal from "~icons/akar-icons/three-line-horizontal";
    import SpecialButton from "./SpecialButton.svelte";
    import type { UserChecks } from "$lib/auth/user";

    interface Item {
        name: string;
        href: string;
        newTab?: boolean;
    }
    const items: Item[] = [
        { name: "Home", href: "/" },
        { name: "Clans", href: "/clans" },
        { name: "Rules", href: "/clans/rules" },
        { name: "Discord", href: "https://discord.clashwithjpa.com", newTab: true }
    ];

    let {
        user,
        checks,
        applicationEnabled,
        cwlEnabled
    }: { user: APIUser | null; checks: UserChecks; applicationEnabled: boolean; cwlEnabled: boolean } = $props();

    let isOpen = $state(false);
    function toggleMenu() {
        isOpen = !isOpen;
    }
</script>

<nav
    class="fixed top-0 z-100 flex max-h-screen w-full flex-col items-center p-4 px-6 backdrop-blur-xs transition-all md:px-12 lg:px-28"
    class:rounded-b-2xl={!isOpen}
    class:md:rounded-bl-none={page.url.href.includes("/admin")}
    class:bg-gray-900={page.url.href.includes("/admin") && (page.status === 200 || page.status === 400) && page.error?.message !== "Not Found"}
    class:!backdrop-blur-md={isOpen}
>
    <div class="flex w-full items-center justify-between">
        <a href="/" class="flex items-center justify-center space-x-1" data-sveltekit-preload-data="hover">
            <img src="/logo.webp" alt="Logo" class="size-12" />
            <p class="text-2xl">JPA</p>
        </a>
        <div class="flex items-center justify-center space-x-4 md:hidden">
            <UserButton {user} {checks} {applicationEnabled} {cwlEnabled} />
            <button onclick={toggleMenu} aria-label="Toggle menu" class="transition-all">
                {#if isOpen}
                    <AkarIconsCross class="size-6" />
                {:else}
                    <AkarIconsThreeLineHorizontal class="size-6" />
                {/if}
            </button>
        </div>
        <div class="hidden items-center justify-center gap-4 md:flex">
            {#each items as item}
                {@const Component = item.name === "Discord" ? SpecialButton : InlineLink}
                <Component href={item.href} newTab={item.newTab}>
                    {item.name}
                </Component>
            {/each}
            <UserButton {user} {checks} {applicationEnabled} {cwlEnabled} />
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
