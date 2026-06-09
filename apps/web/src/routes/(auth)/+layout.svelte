<script lang="ts">
    import { page } from "$app/state";
    import { authClient } from "$lib/auth";
    import Avatar from "$lib/components/ui/Avatar.svelte";
    import Button from "$lib/components/ui/Button.svelte";
    import Drawer from "$lib/components/ui/mobile/Drawer.svelte";
    import { sidebarStore } from "$lib/components/ui/sidebar";
    import type { Role } from "$lib/config/roles";
    import { fadeIn } from "$lib/utils/animations";
    import { createMobileMediaQuery } from "$lib/utils/mobile";
    import { Splitter } from "@ark-ui/svelte/splitter";
    import { onMount } from "svelte";
    import { Toaster } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerX from "~icons/tabler/x";
    import type { LayoutProps } from "./$types";

    let { children, data }: LayoutProps = $props();
    const session = authClient.useSession();

    let links = $derived(page.url.pathname.startsWith("/admin") ? data.adminLinks : data.dashboardLinks);

    let isMobile = $state(false);
    let sidebarWidth = $state(0);

    let isSidebarExpanded = $derived(!isMobile && sidebarWidth > 120);
    const noPaddingPaths: string[] = [
        "/dashboard/apply",
        "/dashboard/cwl",
        "/admin/rules",
        "/admin/users",
        "/admin/coc-accounts",
        "/admin/cwl-applications",
    ];

    let showInfo = $derived(sidebarStore.isOpen && !!sidebarStore.content);

    const LAYOUT_CONFIG = {
        sidebar: { min: 6, max: 16, default: 6 },
        content: { min: 30, max: 85, default: 30 },
        infoSidebar: { min: 15, max: 45, default: 30 },
        mobile: {
            content: { min: 94, max: 99, default: 94 },
            sidebar: { min: 6, max: 10, default: 6 },
        },
    };

    let userSidebarWidth = $state(LAYOUT_CONFIG.sidebar.default);
    let userInfoWidth = $state(LAYOUT_CONFIG.infoSidebar.default);
    let mobileSize = $state([LAYOUT_CONFIG.mobile.content.default, LAYOUT_CONFIG.mobile.sidebar.default]);

    let desktopSize = $derived.by(() => {
        if (isMobile) return [0, 0, 0];
        if (showInfo) {
            const contentWidth = 100 - userSidebarWidth - userInfoWidth;
            return [userSidebarWidth, contentWidth, userInfoWidth];
        }
        return [userSidebarWidth, 100 - userSidebarWidth, 0];
    });

    const desktopPanels = $derived.by(() => [
        { id: "sidebar", minSize: LAYOUT_CONFIG.sidebar.min, maxSize: LAYOUT_CONFIG.sidebar.max },
        { id: "content", minSize: LAYOUT_CONFIG.content.min },
        {
            id: "infosidebar",
            minSize: showInfo ? LAYOUT_CONFIG.infoSidebar.min : 0,
            maxSize: showInfo ? LAYOUT_CONFIG.infoSidebar.max : 0,
        },
    ]);

    const mobilePanels = $derived.by(() => [
        { id: "content", minSize: LAYOUT_CONFIG.mobile.content.min },
        { id: "sidebar", maxSize: LAYOUT_CONFIG.mobile.sidebar.max },
    ]);

    function handleResize(details: Splitter.ResizeDetails) {
        if (isMobile) {
            mobileSize = details.size;
        }
    }

    function handleDragEnd(details: Splitter.ResizeEndDetails) {
        if (isMobile) return;
        const s = details.size;
        if (s.length === 3) {
            userSidebarWidth = s[0];
            if (showInfo && s[2] > 0) {
                userInfoWidth = s[2];
            }
        }
    }

    onMount(() => {
        const cleanup = createMobileMediaQuery((m) => {
            isMobile = m;
        }, "lg");
        return cleanup;
    });

    let navButtonsRef: HTMLElement | null = $state(null);

    let permittedLinks = $derived(links.filter((link) => !link.requiredPerm || data.permissions[link.requiredPerm]));

    $effect(() => {
        if (navButtonsRef) {
            fadeIn(navButtonsRef.querySelectorAll(".dash-nav-btn"));
        }
    });
</script>

<Toaster
    richColors
    theme="dark"
    closeButton
    toastOptions={{
        classes: {
            toast: "font-rubik!",
        },
    }}
>
    {#snippet loadingIcon()}
        <SvgSpinnersRingResize />
    {/snippet}
</Toaster>

{#snippet button(link: any)}
    <div in:fadeIn>
        <Button
            variant={null}
            href={link.href}
            class="flex w-full items-center
            {isSidebarExpanded ? 'flex-row justify-start px-4' : 'flex-col justify-center'}
            overflow-hidden transition-colors duration-200 hover:text-stone-50
            {page.url.pathname == link.href ? 'text-stone-50' : 'text-stone-400'}"
        >
            <link.icon class="size-6 shrink-0 transition-transform duration-200" />
            <span class="{isSidebarExpanded ? 'ml-2 text-sm' : 'text-[10px]'} gap-0.5 truncate font-medium transition-opacity duration-200">
                {link.name}
            </span>
        </Button>
    </div>
{/snippet}

{#snippet SidebarPanel()}
    <Splitter.Panel
        id="sidebar"
        class="flex items-center {isMobile ? 'min-h-16 w-full justify-center py-2' : 'h-full flex-col justify-between py-4'}"
    >
        {#if isMobile}
            <div class="edge-fade w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div class="flex w-max min-w-full items-center justify-evenly gap-8 px-4" bind:this={navButtonsRef}>
                    {#each permittedLinks as link (link.href)}
                        <div class="dash-nav-btn shrink-0">
                            {@render button(link)}
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <div
                class="edge-fade flex min-h-0 w-full flex-1 flex-col justify-start gap-6 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                bind:clientWidth={sidebarWidth}
                bind:this={navButtonsRef}
            >
                {#each permittedLinks as link (link.href)}
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
    <Splitter.Panel id="content" class="size-full min-w-0 rounded-b-2xl bg-stone-950 lg:rounded-2xl">
        {#if $session.data}
            <div in:fadeIn class="size-full overflow-y-auto">
                <div class={!noPaddingPaths.includes(page.url.pathname) ? "p-4" : "size-full"}>
                    {@render children()}
                </div>
            </div>
        {:else}
            <div class="flex size-full flex-col items-center justify-center gap-2 text-stone-400 opacity-50">
                <SvgSpinnersBlocksScale class="size-12 lg:size-16" />
            </div>
        {/if}
    </Splitter.Panel>
{/snippet}

{#snippet InfoSidebar()}
    {#if isMobile}
        <Drawer bind:open={sidebarStore.isOpen} onClose={() => sidebarStore.close()} isParent={true}>
            {@render sidebarStore.content?.()}
        </Drawer>
    {:else}
        <Splitter.Panel id="infosidebar" class="h-full lg:rounded-2xl {!showInfo ? 'hidden' : ''}">
            {#if showInfo && sidebarStore.content}
                <div class="size-full overflow-y-auto p-4">
                    <Button size="icon" variant="ghost" class="fixed top-4 right-4" onclick={() => sidebarStore.close()}>
                        <TablerX />
                    </Button>
                    {@render sidebarStore.content()}
                </div>
            {/if}
        </Splitter.Panel>
    {/if}
{/snippet}

<Splitter.Root
    orientation={isMobile ? "vertical" : "horizontal"}
    class="flex size-full overflow-hidden! bg-stone-900 lg:p-2"
    size={isMobile ? mobileSize : desktopSize}
    onResize={handleResize}
    onResizeEnd={handleDragEnd}
    panels={isMobile ? mobilePanels : desktopPanels}
>
    {#if isMobile}
        {@render ContentPanel()}
        <Splitter.ResizeTrigger id="content:sidebar" disabled class="hidden">
            <div class="hidden"></div>
        </Splitter.ResizeTrigger>
        {@render SidebarPanel()}
        {@render InfoSidebar()}
    {:else}
        {@render SidebarPanel()}
        <Splitter.ResizeTrigger id="sidebar:content" class="group relative flex items-center justify-center outline-none">
            <div class="h-full w-1 rounded-full transition-colors duration-200 group-hover:bg-stone-400"></div>
        </Splitter.ResizeTrigger>
        {@render ContentPanel()}
        <Splitter.ResizeTrigger
            id="content:infosidebar"
            disabled={!showInfo}
            class={!showInfo ? "hidden" : "group relative flex items-center justify-center outline-none"}
        >
            {#if showInfo}
                <div class="h-full w-1 rounded-full transition-colors duration-200 group-hover:bg-stone-400"></div>
            {/if}
        </Splitter.ResizeTrigger>
        {@render InfoSidebar()}
    {/if}
</Splitter.Root>
