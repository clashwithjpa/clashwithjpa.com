<script lang="ts" module>
    import LucideBook from "~icons/lucide/book";
    import LucideDrama from "~icons/lucide/drama";
    import LucideFileClock from "~icons/lucide/file-clock";
    import LucideHouse from "~icons/lucide/house";
    import LucideSettings from "~icons/lucide/settings";
    import LucideSwords from "~icons/lucide/swords";
    import LucideUsers from "~icons/lucide/users";

    const data = [
        {
            title: "Overview",
            icon: LucideHouse,
            url: "/admin"
        },
        {
            title: "Clans",
            icon: LucideDrama,
            url: "/admin/clans"
        },
        {
            title: "Users",
            icon: LucideUsers,
            url: "/admin/users"
        },
        {
            title: "Applications",
            icon: LucideFileClock,
            url: "/admin/applications"
        },
        {
            title: "CWL",
            icon: LucideSwords,
            url: "/admin/cwl"
        },
        {
            title: "Rules",
            icon: LucideBook,
            url: "/admin/rules"
        },
        {
            title: "Settings",
            icon: LucideSettings,
            url: "/admin/settings"
        }
    ];
</script>

<script lang="ts">
    import { goto, invalidateAll } from "$app/navigation";
    import { page } from "$app/state";
    import type { UserData } from "$lib/auth/user";
    import * as Avatar from "$lib/components/admin/ui/avatar";
    import * as Breadcrumb from "$lib/components/admin/ui/breadcrumb";
    import { Button } from "$lib/components/admin/ui/button";
    import { Separator } from "$lib/components/admin/ui/separator";
    import * as Sidebar from "$lib/components/admin/ui/sidebar";
    import * as Tooltip from "$lib/components/admin/ui/tooltip";
    import type { Snippet } from "svelte";
    import LucideLogOut from "~icons/lucide/log-out";

    let { user, children }: { user: UserData; children: Snippet } = $props();

    async function logout() {
        await goto("/");
        await fetch("/auth/logout");
        invalidateAll();
    }
</script>

<Sidebar.Provider>
    <Sidebar.Root variant="floating">
        <Sidebar.Content>
            <Sidebar.Group>
                <Sidebar.Menu>
                    {#each data as item (item.title)}
                        <Sidebar.MenuItem>
                            <Sidebar.SidebarMenuButton isActive={item.url === page.url.pathname}>
                                {#snippet child({ props })}
                                    <a href={item.url} {...props}>
                                        <item.icon />
                                        <span>{item.title}</span>
                                    </a>
                                {/snippet}
                            </Sidebar.SidebarMenuButton>
                        </Sidebar.MenuItem>
                    {/each}
                </Sidebar.Menu>
            </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Footer>
            <Sidebar.Menu>
                <Sidebar.MenuItem>
                    <div class="flex items-center justify-between gap-2 px-1 py-1.5 text-left text-sm">
                        <div class="flex items-center gap-2">
                            <Avatar.Root class="size-8 rounded-lg">
                                <Avatar.Image src="https://media.discordapp.net/avatars/{user.id}/{user.avatar}" alt={user.global_name} />
                                <Avatar.Fallback class="rounded-lg">
                                    {user.global_name?.slice(0, 2).toUpperCase()}
                                </Avatar.Fallback>
                            </Avatar.Root>
                            <div class="grid flex-1 text-left text-sm leading-tight">
                                <span class="truncate font-medium">{user.global_name}</span>
                                <span class="truncate text-xs opacity-50">{user.username}</span>
                            </div>
                        </div>
                        <Tooltip.Provider>
                            <Tooltip.Root>
                                <Tooltip.Trigger>
                                    <Button onclick={logout}>
                                        <LucideLogOut class="size-5" />
                                    </Button>
                                </Tooltip.Trigger>
                                <Tooltip.Content>
                                    <p>Logout</p>
                                </Tooltip.Content>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                    </div>
                </Sidebar.MenuItem>
            </Sidebar.Menu>
        </Sidebar.Footer>
        <Sidebar.Rail />
    </Sidebar.Root>
    <Sidebar.Inset>
        <header class="flex h-16 shrink-0 items-center gap-2 px-4">
            <Sidebar.Trigger class="-ml-1" />
            <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb.Root>
                <Breadcrumb.List>
                    <Breadcrumb.Item class="hidden md:block">
                        <Breadcrumb.Link href="#">Admin Panel</Breadcrumb.Link>
                    </Breadcrumb.Item>
                    <Breadcrumb.Separator class="hidden md:block" />
                    <Breadcrumb.Item>
                        <Breadcrumb.Page>
                            {#if page.url.pathname === "/admin"}
                                Overview
                            {:else}
                                {page.url.pathname
                                    .replace("/admin/", "") // Remove "/admin/"
                                    .replace(/^\//, "") // Remove leading slash if any
                                    .split("/") // Split by "/"
                                    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)) // Title case each segment
                                    .join(" / ")}
                            {/if}
                        </Breadcrumb.Page>
                    </Breadcrumb.Item>
                </Breadcrumb.List>
            </Breadcrumb.Root>
        </header>
        {@render children()}
    </Sidebar.Inset>
</Sidebar.Provider>
