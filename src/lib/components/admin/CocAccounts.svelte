<script lang="ts">
    import type { APIPlayer } from "$lib/coc/types";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import * as Sheet from "$lib/components/ui/sheet";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import * as Table from "$lib/components/ui/table";
    import type { InsertCoc } from "$lib/server/schema";
    import { toast } from "svelte-sonner";
    import { fly } from "svelte/transition";
    import LucideCastle from "~icons/lucide/castle";
    import LucideCheck from "~icons/lucide/check";
    import LucideLoader2 from "~icons/lucide/loader-2";
    import LucideTrash from "~icons/lucide/trash";
    import LucideTrophy from "~icons/lucide/trophy";
    import LucideWeight from "~icons/lucide/weight";
    import LucideX from "~icons/lucide/x";

    interface Props {
        cocAccounts: InsertCoc[];
    }
    let { cocAccounts }: Props = $props();
    let disabled: boolean = $state(false);
    let loading: boolean = $state(false);
    let open: boolean = $state(false);
    let syncing: boolean = $state(false);

    type CocAccountWithPlayer = InsertCoc & { playerData?: APIPlayer; selected?: boolean; editingWeight?: boolean; tempWeight?: number };

    async function fetchCocAccountsWithPlayers(): Promise<CocAccountWithPlayer[]> {
        const players = await Promise.all(
            cocAccounts.map((account) =>
                fetch(`/api/player?tag=${encodeURIComponent(account.tag)}`)
                    .then((res) => res.json())
                    .then((data) => data as APIPlayer)
                    .catch(() => null)
            )
        );
        return cocAccounts.map((account, index) => ({
            ...account,
            playerData: players[index] || undefined,
            selected: false,
            editingWeight: false,
            tempWeight: account.weight
        }));
    }

    let accounts = $state<CocAccountWithPlayer[]>([]);
    let sortBy = $state<"name" | "th" | "weight" | "clan">("name");
    let sortDirection = $state<"asc" | "desc">("asc");

    $effect(() => {
        if (open && accounts.length === 0 && cocAccounts.length > 0) {
            syncing = true;
            fetchCocAccountsWithPlayers().then((data) => {
                accounts = data;
                syncing = false;
            });
        }
    });

    const sortedAccounts = $derived.by(() => {
        const sorted = [...accounts].sort((a, b) => {
            let aVal: any, bVal: any;
            switch (sortBy) {
                case "name":
                    aVal = a.playerData?.name || "";
                    bVal = b.playerData?.name || "";
                    break;
                case "th":
                    aVal = a.playerData?.townHallLevel || 0;
                    bVal = b.playerData?.townHallLevel || 0;
                    break;
                case "weight":
                    aVal = a.weight;
                    bVal = b.weight;
                    break;
                case "clan":
                    aVal = a.playerData?.clan?.name || "";
                    bVal = b.playerData?.clan?.name || "";
                    break;
            }
            return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
        });
        return sorted;
    });

    const selectedCount = $derived(accounts.filter((acc) => acc.selected).length);
    const allSelected = $derived(accounts.length > 0 && accounts.every((acc) => acc.selected));

    function toggleAll() {
        const newSelected = !allSelected;
        accounts.forEach((acc) => (acc.selected = newSelected));
    }

    function toggleSort(column: typeof sortBy) {
        if (sortBy === column) {
            sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
            sortBy = column;
            sortDirection = "asc";
        }
    }

    async function updateWeight(account: CocAccountWithPlayer) {
        syncing = true;
        const response = await fetch(`/api/coc`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                key: "update_weight",
                value: {
                    tag: account.tag,
                    weight: account.tempWeight
                }
            })
        });
        if (response.ok) {
            account.weight = account.tempWeight!;
            account.editingWeight = false;
            toast.success("Weight updated");
        } else {
            toast.error("Failed to update weight");
        }
        syncing = false;
    }

    async function removeAcc(tags: string[]) {
        disabled = true;
        loading = true;
        syncing = true;
        const response = await fetch(`/api/coc`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                key: "remove_acc",
                value: tags
            })
        });
        if (response.ok) {
            toast.success("Accounts deleted");
            accounts = accounts.filter((acc) => !tags.includes(acc.tag));
        } else {
            toast.error("Failed to remove accounts");
        }
        loading = false;
        syncing = false;
        setTimeout(() => {
            disabled = false;
        }, 500);
    }
</script>

<Sheet.Root bind:open>
    <Sheet.Trigger>
        <div class="bg-accent hover:bg-accent/80 rounded-md px-2 py-1 font-medium transition-colors">
            <p class="text-sm">{cocAccounts.length} Account{cocAccounts.length !== 1 ? "s" : ""}</p>
        </div>
    </Sheet.Trigger>
    <Sheet.Content class="flex w-full flex-col sm:max-w-150">
        <Sheet.Header>
            <div class="flex items-center gap-2">
                <div class="flex-1">
                    <Sheet.Title>Linked Accounts</Sheet.Title>
                    <Sheet.Description>Manage Clash of Clans accounts</Sheet.Description>
                </div>
                {#if syncing}
                    <div class="flex items-center gap-2">
                        <LucideLoader2 class="text-muted-foreground size-5 animate-spin" />
                        <span class="text-muted-foreground text-sm">Syncing...</span>
                    </div>
                {/if}
            </div>
        </Sheet.Header>

        {#if cocAccounts.length === 0}
            <div class="flex size-full flex-col items-center justify-center gap-3 py-12">
                <LucideCastle class="text-muted-foreground size-12" />
                <div class="text-center">
                    <p class="font-medium">No accounts linked</p>
                    <p class="text-muted-foreground text-sm">This player hasn't linked any Clash of Clans accounts yet</p>
                </div>
            </div>
        {:else if accounts.length === 0}
            <div class="flex flex-col gap-3 py-6">
                <Skeleton class="h-12 w-full" />
                <Skeleton class="h-12 w-full" />
                <Skeleton class="h-12 w-full" />
            </div>
        {:else}
            <div in:fly={{ y: -10, duration: 200 }} class="flex flex-1 flex-col gap-4 overflow-hidden py-4">
                <!-- Actions Bar -->
                <div class="flex items-center justify-between px-2">
                    {#if selectedCount > 0}
                        <span class="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium">
                            {selectedCount} selected
                        </span>
                    {:else}
                        <div></div>
                    {/if}
                    <Button
                        size="sm"
                        variant="destructive"
                        disabled={selectedCount === 0 || disabled}
                        onclick={async () => {
                            await removeAcc(accounts.filter((acc) => acc.selected).map((acc) => acc.tag));
                        }}
                    >
                        {#if loading}
                            <LucideLoader2 class="mr-2 size-4 animate-spin" />
                        {:else}
                            <LucideTrash class="mr-2 size-4" />
                        {/if}
                        Delete
                    </Button>
                </div>

                <!-- Table -->
                <div class="flex-1 overflow-auto rounded-md border">
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.Head class="w-12">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onchange={toggleAll}
                                        class="border-input bg-background ring-offset-background focus-visible:ring-ring size-4 cursor-pointer rounded border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                    />
                                </Table.Head>
                                <Table.Head>
                                    <button
                                        type="button"
                                        onclick={() => toggleSort("name")}
                                        class="hover:text-foreground text-muted-foreground flex items-center gap-1 font-medium transition-colors"
                                    >
                                        Player
                                        {#if sortBy === "name"}
                                            <span class="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                                        {/if}
                                    </button>
                                </Table.Head>
                                <Table.Head>
                                    <button
                                        type="button"
                                        onclick={() => toggleSort("th")}
                                        class="hover:text-foreground text-muted-foreground flex items-center gap-1 font-medium transition-colors"
                                    >
                                        TH
                                        {#if sortBy === "th"}
                                            <span class="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                                        {/if}
                                    </button>
                                </Table.Head>
                                <Table.Head>
                                    <button
                                        type="button"
                                        onclick={() => toggleSort("weight")}
                                        class="hover:text-foreground text-muted-foreground flex items-center gap-1 font-medium transition-colors"
                                    >
                                        Weight
                                        {#if sortBy === "weight"}
                                            <span class="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                                        {/if}
                                    </button>
                                </Table.Head>
                                <Table.Head>
                                    <button
                                        type="button"
                                        onclick={() => toggleSort("clan")}
                                        class="hover:text-foreground text-muted-foreground flex items-center gap-1 font-medium transition-colors"
                                    >
                                        Clan
                                        {#if sortBy === "clan"}
                                            <span class="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                                        {/if}
                                    </button>
                                </Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each sortedAccounts as account (account.tag)}
                                <Table.Row>
                                    <Table.Cell>
                                        <input
                                            type="checkbox"
                                            bind:checked={account.selected}
                                            class="border-input bg-background ring-offset-background focus-visible:ring-ring size-4 cursor-pointer rounded border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                        />
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div class="flex flex-col gap-0.5">
                                            <span class="font-medium">{account.playerData?.name || "Unknown"}</span>
                                            <code class="text-muted-foreground text-xs">{account.tag}</code>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {#if account.playerData?.townHallLevel}
                                            <div
                                                class="bg-primary/10 text-primary flex w-fit items-center gap-1 rounded px-2 py-1 text-xs font-semibold"
                                            >
                                                <LucideCastle class="size-3" />
                                                {account.playerData.townHallLevel}
                                            </div>
                                        {:else}
                                            <span class="text-muted-foreground text-sm">-</span>
                                        {/if}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {#if account.editingWeight}
                                            <div class="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    bind:value={account.tempWeight}
                                                    class="h-8 w-20 text-sm"
                                                    min="0"
                                                    onkeydown={(e) => {
                                                        if (e.key === "Enter") {
                                                            updateWeight(account);
                                                        } else if (e.key === "Escape") {
                                                            account.editingWeight = false;
                                                            account.tempWeight = account.weight;
                                                        }
                                                    }}
                                                />
                                                <Button variant="ghost" onclick={() => updateWeight(account)}>
                                                    <LucideCheck class="size-4 text-green-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onclick={(e) => {
                                                        const scrollContainer = e.currentTarget.closest(".overflow-auto");
                                                        const scrollTop = scrollContainer?.scrollTop || 0;
                                                        account.editingWeight = false;
                                                        account.tempWeight = account.weight;
                                                        requestAnimationFrame(() => {
                                                            if (scrollContainer) {
                                                                scrollContainer.scrollTop = scrollTop;
                                                            }
                                                        });
                                                    }}
                                                >
                                                    <LucideX class="size-4 text-red-600" />
                                                </Button>
                                            </div>
                                        {:else}
                                            <button
                                                onclick={(e) => {
                                                    const scrollContainer = e.currentTarget.closest(".overflow-auto");
                                                    const scrollTop = scrollContainer?.scrollTop || 0;
                                                    account.editingWeight = true;
                                                    requestAnimationFrame(() => {
                                                        if (scrollContainer) {
                                                            scrollContainer.scrollTop = scrollTop;
                                                        }
                                                    });
                                                }}
                                                class="hover:bg-accent flex items-center gap-1.5 rounded px-2 py-1 transition-colors"
                                            >
                                                <LucideWeight class="text-muted-foreground size-3.5" />
                                                <span class="text-sm font-medium">{account.weight}</span>
                                            </button>
                                        {/if}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {#if account.playerData?.clan}
                                            <div class="flex items-center gap-2">
                                                <LucideTrophy class="text-muted-foreground size-4" />
                                                <span class="text-sm">{account.playerData.clan.name}</span>
                                            </div>
                                        {:else}
                                            <span class="text-muted-foreground text-sm">No Clan</span>
                                        {/if}
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    </Table.Root>
                </div>

                <!-- Footer -->
                <div class="text-muted-foreground px-2 text-sm">
                    Total: {accounts.length} account{accounts.length !== 1 ? "s" : ""}
                </div>
            </div>
        {/if}
    </Sheet.Content>
</Sheet.Root>
