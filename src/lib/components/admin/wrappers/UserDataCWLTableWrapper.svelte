<script lang="ts">
    import type { APIPlayer } from "$lib/coc/types";
    import * as Popover from "$lib/components/ui/popover";
    import type { ICellRendererParams } from "@ag-grid-community/core";
    import { fly } from "svelte/transition";
    import LucideCastle from "~icons/lucide/castle";
    import LucideCrown from "~icons/lucide/crown";
    import LucideInfo from "~icons/lucide/info";
    import LucideLoaderCircle from "~icons/lucide/loader-circle";
    import LucideTrophy from "~icons/lucide/trophy";
    import LucideUser from "~icons/lucide/user";
    import LucideWeight from "~icons/lucide/weight";

    let params: ICellRendererParams = $props();
    let tag: string = params.data.accountTag;
    let accountWeight = $state<number>(params.data.accountWeight || 0);

    async function fetchCocAccount(): Promise<APIPlayer> {
        return Promise.resolve(
            fetch(`/api/player?tag=${encodeURIComponent(tag)}`)
                .then((res) => res.json())
                .then((data) => data as APIPlayer)
        );
    }
</script>

<Popover.Root>
    <Popover.Trigger>
        <button
            class="group border-border bg-card hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-1 rounded border px-2 py-1 text-sm font-medium transition-colors"
        >
            <LucideInfo class="size-3 opacity-70" />
            <span>Details</span>
        </button>
    </Popover.Trigger>
    <Popover.Content class="w-80 p-0" align="start">
        {#await fetchCocAccount()}
            <div class="flex items-center justify-center py-6">
                <LucideLoaderCircle class="text-primary size-6 animate-spin"></LucideLoaderCircle>
            </div>
        {:then acc}
            <div in:fly={{ y: -8, duration: 200 }} class="flex flex-col">
                <!-- Header -->
                <div class="from-primary/5 to-primary/10 relative overflow-hidden border-b bg-linear-to-r px-3 py-2.5">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-sm font-bold">{acc.name}</h3>
                            <code class="text-muted-foreground text-xs">{acc.tag}</code>
                        </div>
                        <div class="bg-primary/10 ring-primary/20 flex items-center gap-1 rounded-full px-2 py-0.5 ring-1">
                            <LucideCastle class="text-primary size-3" />
                            <span class="text-primary text-xs font-bold">TH {acc.townHallLevel}</span>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="space-y-3 p-3">
                    <!-- Clan Info -->
                    <div class="space-y-1.5">
                        <div class="flex items-center gap-1.5">
                            <LucideUser class="text-muted-foreground size-3" />
                            <span class="text-muted-foreground text-xs font-medium">Clan Info</span>
                        </div>
                        <div class="bg-muted/50 space-y-1.5 rounded-md px-2.5 py-2">
                            <div class="flex items-center gap-2">
                                <LucideCastle class="text-muted-foreground size-3.5 shrink-0" />
                                <span class="truncate text-xs font-medium">{acc.clan?.name || "No Clan"}</span>
                            </div>
                            {#if acc.role}
                                <div class="flex items-center gap-2">
                                    <LucideCrown class="text-muted-foreground size-3.5 shrink-0" />
                                    <span class="text-xs font-medium capitalize">{acc.role}</span>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Stats Grid -->
                    <div class="space-y-1.5">
                        <div class="flex items-center gap-1.5">
                            <LucideTrophy class="text-muted-foreground size-3" />
                            <span class="text-muted-foreground text-xs font-medium">Stats</span>
                        </div>
                        <div class="bg-muted/50 rounded-md p-2">
                            <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground text-xs">Trophies</span>
                                    <span class="text-xs font-medium">{acc.trophies.toLocaleString()}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground text-xs">War Stars</span>
                                    <span class="text-xs font-medium">{acc.warStars.toLocaleString()}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground text-xs">Attacks</span>
                                    <span class="text-xs font-medium">{acc.attackWins.toLocaleString()}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground text-xs">Donations</span>
                                    <span class="text-xs font-medium">{acc.donations.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Weight Input -->
                    <div class="space-y-1.5">
                        <div class="flex items-center gap-1.5">
                            <LucideWeight class="text-muted-foreground size-3" />
                            <span class="text-muted-foreground text-xs font-medium">Account Weight</span>
                        </div>
                        <div class="bg-muted/50 rounded-md px-2.5 py-2">
                            <span class="text-sm font-medium">{accountWeight}</span>
                        </div>
                    </div>
                </div>
            </div>
        {/await}
    </Popover.Content>
</Popover.Root>
