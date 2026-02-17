<script lang="ts" module>
    import type { Component } from "svelte";
    import LucideBook from "~icons/lucide/book";
    import LucideChevronsUpDown from "~icons/lucide/chevrons-up-down";
    import LucideDrama from "~icons/lucide/drama";
    import LucideFileClock from "~icons/lucide/file-clock";
    import LucideHouse from "~icons/lucide/house";
    import LucideLogOut from "~icons/lucide/log-out";
    import LucideSettings from "~icons/lucide/settings";
    import LucideSword from "~icons/lucide/sword";
    import LucideSwords from "~icons/lucide/swords";
    import LucideUsers from "~icons/lucide/users";
    import LucideX from "~icons/lucide/x";

    interface Data {
        title: string;
        icon: Component;
        url: string;
    }

    const data: Data[] = [
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
            icon: LucideSword,
            url: "/admin/cwl"
        },
        {
            title: "CWL Clans",
            icon: LucideSwords,
            url: "/admin/cwl/clans"
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
        },
        {
            title: "Exit",
            icon: LucideX,
            url: "/"
        }
    ];
</script>

<script lang="ts">
    import { goto, invalidateAll } from "$app/navigation";
    import { page } from "$app/state";
    import type { UserData } from "$lib/auth/user";
    import * as Avatar from "$lib/components/ui/avatar";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as Sidebar from "$lib/components/ui/sidebar";

    let { user }: { user: UserData } = $props();

    async function logout() {
        await goto("/");
        await fetch("/auth/logout");
        invalidateAll();
    }
</script>

<Sidebar.Root collapsible="icon" variant="floating">
    <Sidebar.Content>
        <Sidebar.Group>
            <Sidebar.Menu>
                {#each data as item (item.title)}
                    <Sidebar.MenuItem>
                        <Sidebar.SidebarMenuButton isActive={item.url === page.url.pathname} tooltipContent={item.title}>
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
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        {#snippet child({ props })}
                            <Sidebar.MenuButton size="lg" {...props} class="cursor-pointer">
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
                                <LucideChevronsUpDown class="ml-auto size-4" />
                            </Sidebar.MenuButton>
                        {/snippet}
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Content class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg" side="top" align="end" sideOffset={4}>
                        <DropdownMenu.Label class="p-0 font-normal">
                            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
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
                        </DropdownMenu.Label>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Group>
                            <DropdownMenu.Item onclick={logout}>
                                <LucideLogOut />
                                Logout
                            </DropdownMenu.Item>
                        </DropdownMenu.Group>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
            </Sidebar.MenuItem>
        </Sidebar.Menu>
    </Sidebar.Footer>
    <Sidebar.Rail />
</Sidebar.Root>
