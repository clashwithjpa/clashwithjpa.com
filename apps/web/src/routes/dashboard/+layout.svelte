<script lang="ts">
    import { page } from "$app/state";
    import { authClient } from "$lib/auth";
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import type { Role } from "$lib/config/roles";
    import { fadeIn } from "$lib/utils/animations";
    import type { Component } from "svelte";
    import TablerFileDescription from "~icons/tabler/file-description";
    import TablerHome from "~icons/tabler/home";
    import TablerSwords from "~icons/tabler/swords";
    import TablerX from "~icons/tabler/x";

    let { children } = $props();

    let links: { name: string; icon: Component; href: string }[] = [
        { name: "Home ", icon: TablerHome, href: "/dashboard" },
        { name: "Apply", icon: TablerSwords, href: "/dashboard/wars" },
        { name: "Clan War League", icon: TablerFileDescription, href: "/dashboard/cwl" },
        { name: "Exit", icon: TablerX, href: "/" },
    ];

    const session = authClient.useSession();

    $effect(() => {
        fadeIn(document.querySelectorAll(".dash-nav-btn"));
    });
</script>

<div
    class="grid size-full grid-cols-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-stone-900 lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:gap-2 lg:p-2"
>
    <!-- Sidebar -->
    <div class="hidden h-full flex-col items-center justify-between py-3 lg:flex">
        <div class="flex flex-col items-center justify-start gap-6 p-2">
            {#each links as link (link.href)}
                <Tooltip title={link.name} placement="right">
                    <a href={link.href} class="dash-nav-btn">
                        <link.icon
                            class="size-6 transition-colors duration-200 hover:text-stone-50
                            {page.url.pathname == link.href ? 'text-stone-50' : 'text-stone-400'}"
                        />
                    </a>
                </Tooltip>
            {/each}
        </div>
        <div class="flex w-full items-center justify-center">
            <Avatar
                src={$session.data?.user.image}
                name={$session.data?.user.name || ""}
                role={($session.data?.user.role as Role) || "unverified"}
                size="sm"
            />
        </div>
    </div>

    <!-- Main content -->
    <div class="size-full min-w-0 overflow-y-auto rounded-2xl bg-stone-950 p-4">
        {@render children()}
    </div>

    <!-- Mobile navigation -->
    <div class="w-full p-3 lg:hidden">
        <div class="relative grid w-full grid-cols-2 items-center">
            <div class="grid grid-cols-2 place-items-center pr-8">
                {#each links.slice(0, 2) as link (link.href)}
                    <a href={link.href} class="dash-nav-btn flex size-10 items-center justify-center rounded-xl" aria-label={link.name}>
                        <link.icon
                            class="size-6 transition-colors duration-200 hover:text-stone-50
                            {page.url.pathname == link.href ? 'text-stone-50' : 'text-stone-400'}"
                        />
                    </a>
                {/each}
            </div>

            <div class="grid grid-cols-2 place-items-center pl-8">
                {#each links.slice(2) as link (link.href)}
                    <a href={link.href} class="dash-nav-btn flex size-10 items-center justify-center rounded-xl" aria-label={link.name}>
                        <link.icon
                            class="size-6 transition-colors duration-200 hover:text-stone-50
                            {page.url.pathname == link.href ? 'text-stone-50' : 'text-stone-400'}"
                        />
                    </a>
                {/each}
            </div>

            <div class="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center justify-center">
                <Avatar
                    src={$session.data?.user.image}
                    name={$session.data?.user.name || ""}
                    role={($session.data?.user.role as Role) || "unverified"}
                    size="md"
                />
            </div>
        </div>
    </div>
</div>
