<script lang="ts">
    import { onNavigate } from "$app/navigation";
    import { page } from "$app/state";
    import Bar from "$lib/components/admin/SideBar.svelte";
    import * as Breadcrumb from "$lib/components/ui/breadcrumb";
    import { Separator } from "$lib/components/ui/separator";
    import * as Sidebar from "$lib/components/ui/sidebar";
    import { Toaster } from "$lib/components/ui/sonner";
    import type { Snippet } from "svelte";
    import type { PageData } from "./admin/$types";

    interface Props {
        data: PageData;
        children: Snippet;
    }

    let { data, children }: Props = $props();

    onNavigate((navigation) => {
        if (!document.startViewTransition) return;

        return new Promise((resolve) => {
            document.startViewTransition(async () => {
                resolve();
                await navigation.complete;
            });
        });
    });
</script>

<svelte:head>
    <title>JPA | Admin</title>
</svelte:head>

<Toaster />

<Sidebar.Provider>
    <Bar user={data.user} />
    <Sidebar.Inset>
        <header class="flex h-16 shrink-0 items-center gap-2 px-4">
            <Sidebar.Trigger class="-ml-1" />
            <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb.Root>
                <Breadcrumb.List>
                    <Breadcrumb.Item class="hidden md:block">
                        <Breadcrumb.Link href="/admin">Admin Panel</Breadcrumb.Link>
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
        <div class="size-full p-4">
            {@render children()}
        </div>
    </Sidebar.Inset>
</Sidebar.Provider>
