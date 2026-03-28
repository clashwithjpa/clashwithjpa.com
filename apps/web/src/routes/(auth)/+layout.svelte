<script lang="ts">
    import { page } from "$app/state";
    import { authClient, hasPermission } from "$lib/auth";
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import type { statement } from "$lib/config/permissions";
    import type { Role } from "$lib/config/roles";
    import { fadeIn } from "$lib/utils/animations";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { Splitter } from "@ark-ui/svelte/splitter";
    import { onMount, type Component } from "svelte";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import TablerBook2 from "~icons/tabler/book-2";
    import TablerFileDescription from "~icons/tabler/file-description";
    import TablerHome from "~icons/tabler/home";
    import TablerSettings from "~icons/tabler/settings";
    import TablerSwords from "~icons/tabler/swords";
    import TablerUser from "~icons/tabler/user";
    import TablerX from "~icons/tabler/x";
    import type { LayoutProps } from "./$types";

    let { children }: LayoutProps = $props();
    const session = authClient.useSession();

    interface Link {
        name: string;
        icon: Component;
        href: string;
        requiredPerm?: (typeof statement.jpa)[number];
    }

    let dashboardLinks: Link[] = [
        { name: "Home ", icon: TablerHome, href: "/dashboard" },
        { name: "Apply", icon: TablerFileDescription, href: "/dashboard/apply", requiredPerm: "apply" },
        { name: "CWL", icon: TablerSwords, href: "/dashboard/cwl", requiredPerm: "cwl" },
        { name: "Settings", icon: TablerSettings, href: "/admin/settings" },
        { name: "Exit", icon: TablerX, href: "/" },
    ];

    let adminLinks: Link[] = [
        { name: "Home", icon: TablerHome, href: "/admin" },
        { name: "CWL", icon: TablerSwords, href: "/admin/cwl-applications", requiredPerm: "review" },
        { name: "Applications", icon: TablerFileDescription, href: "/admin/join-applications", requiredPerm: "review" },
        { name: "Users", icon: TablerUser, href: "/admin/users", requiredPerm: "manage" },
        { name: "Rules", icon: TablerBook2, href: "/admin/rules", requiredPerm: "manage" },
        { name: "Settings", icon: TablerSettings, href: "/admin/settings", requiredPerm: "sudo" },
        { name: "Exit", icon: TablerX, href: "/" },
    ];

    let links = $derived(page.url.pathname.startsWith("/admin") ? adminLinks : dashboardLinks);

    let isMobile = $state(false);
    let sidebarWidth = $state(0);

    let isSidebarExpanded = $derived(!isMobile && sidebarWidth > 120);

    onMount(() => {
        const cleanup = createMobileMediaQuery((m) => {
            isMobile = m;
        }, "lg");
        return cleanup;
    });

    $effect(() => {
        fadeIn(document.querySelectorAll(".dash-nav-btn"));
    });
</script>

{#snippet button(link: Link)}
    {#await hasPermission($session.data?.user.id, link.requiredPerm)}
        <div
            class="flex w-full animate-pulse items-center gap-1 {isSidebarExpanded
                ? 'flex-row justify-start px-4'
                : 'flex-col justify-center'} overflow-hidden"
        >
            <div class="size-6 shrink-0 rounded-lg bg-stone-700"></div>
            <div class="{isSidebarExpanded ? 'ml-2 h-4 w-full' : 'h-3 w-8'} rounded-lg bg-stone-700"></div>
        </div>
    {:then hasPermission}
        <div in:fadeIn>
            <Button
                variant={null}
                href={link.href}
                class="flex w-full items-center {isSidebarExpanded
                    ? 'flex-row justify-start px-4'
                    : 'flex-col justify-center'} overflow-hidden transition-colors duration-200
                    {hasPermission && 'hover:text-stone-50'}
                    {!hasPermission && 'cursor-not-allowed! opacity-50!'}
                    {page.url.pathname == link.href && hasPermission ? 'text-stone-50' : 'text-stone-400'}"
                disabled={!hasPermission}
            >
                <link.icon class="size-6 shrink-0 transition-transform duration-200" />
                <span class="{isSidebarExpanded ? 'ml-2 text-sm' : 'text-[10px]'} gap-0.5 truncate font-medium transition-opacity duration-200">
                    {link.name}
                </span>
            </Button>
        </div>
    {/await}
{/snippet}

{#snippet SidebarPanel()}
    <Splitter.Panel id="sidebar" class="flex items-center {isMobile ? 'min-h-16 w-full justify-center p-2' : 'h-full flex-col justify-between py-4'}">
        {#if isMobile}
            <div class="flex w-full items-center justify-evenly gap-4">
                {#each links as link (link.href)}
                    {@render button(link)}
                {/each}
            </div>
        {:else}
            <div class="flex w-full flex-col justify-start gap-6 p-2" bind:clientWidth={sidebarWidth}>
                {#each links as link (link.href)}
                    <div class="dash-nav-btn">
                        {@render button(link)}
                    </div>
                {/each}
            </div>
            <div
                class="flex w-full items-center overflow-hidden {isSidebarExpanded
                    ? 'justify-start px-6'
                    : 'justify-center'} pb-4 transition-all duration-200"
            >
                {#if $session.data}
                    <Avatar
                        src={$session.data?.user.image}
                        name={$session.data?.user.name || ""}
                        role={($session.data?.user.role as Role) || "unverified"}
                    />
                {:else}
                    <SvgSpinnersBlocksScale class="size-8 text-stone-400" />
                {/if}
                {#if isSidebarExpanded}
                    <div class="ml-4 flex flex-col overflow-hidden">
                        <span class="truncate text-sm font-medium text-stone-200">{$session.data?.user.name}</span>
                        <span class="truncate text-xs text-stone-400 capitalize">{($session.data?.user.role as Role) || "unverified"}</span>
                    </div>
                {/if}
            </div>
        {/if}
    </Splitter.Panel>
{/snippet}

{#snippet ContentPanel()}
    <Splitter.Panel id="content" class="size-full min-w-0 overflow-y-auto rounded-2xl bg-stone-950 p-4">
        {#if $session.data}
            <div in:fadeIn class="size-full">
                {@render children()}
            </div>
        {:else}
            <div class="flex size-full flex-col items-center justify-center gap-2 text-stone-400 opacity-50">
                <SvgSpinnersBlocksScale class="size-12 lg:size-16" />
            </div>
        {/if}
    </Splitter.Panel>
{/snippet}

<Splitter.Root
    orientation={isMobile ? "vertical" : "horizontal"}
    class="flex size-full overflow-hidden! bg-stone-900 lg:p-2"
    panels={isMobile
        ? [
              { id: "content", minSize: 94 },
              { id: "sidebar", maxSize: 6 },
          ]
        : [
              { id: "sidebar", minSize: 6, maxSize: 16 },
              { id: "content", minSize: 84 },
          ]}
    defaultSize={isMobile ? [94, 6] : [6, 94]}
>
    {#if isMobile}
        {@render ContentPanel()}
        <Splitter.ResizeTrigger id="content:sidebar" disabled class="hidden">
            <div class="hidden"></div>
        </Splitter.ResizeTrigger>
        {@render SidebarPanel()}
    {:else}
        {@render SidebarPanel()}
        <Splitter.ResizeTrigger id="sidebar:content" class="group relative flex items-center justify-center outline-none">
            <div class="h-full w-1 rounded-full transition-colors duration-200 group-hover:bg-stone-400"></div>
        </Splitter.ResizeTrigger>
        {@render ContentPanel()}
    {/if}
</Splitter.Root>
