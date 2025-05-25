<script lang="ts" module>
    import LucideBook from "~icons/lucide/book";
    import LucideDrama from "~icons/lucide/drama";
    import LucideFileClock from "~icons/lucide/file-clock";
    import LucideHouse from "~icons/lucide/house";
    import LucideSettings from "~icons/lucide/settings";
    import LucideSwords from "~icons/lucide/swords";
    import LucideUsers from "~icons/lucide/users";
    import LucideX from "~icons/lucide/x";

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
    import { Button } from "$lib/components/ui/button";
    import * as Sidebar from "$lib/components/ui/sidebar";
    import * as Tooltip from "$lib/components/ui/tooltip";
    import LucideLogOut from "~icons/lucide/log-out";

    let { user }: { user: UserData } = $props();

    async function logout() {
        await goto("/");
        await fetch("/auth/logout");
        invalidateAll();
    }
</script>

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
                <div class="flex items-center justify-between gap-4 text-left text-sm">
                    <div class="flex items-center gap-2">
                        <Avatar.Root class="size-12 rounded-lg">
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
                                <Button onclick={logout} size="icon">
                                    <LucideLogOut />
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
