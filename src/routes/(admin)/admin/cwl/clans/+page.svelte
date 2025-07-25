<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { page } from "$app/state";
    import { cwlClanForm, cwlClanFormSchema } from "$lib/coc/schema";
    import Grid from "$lib/components/admin/Grid.svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import { Separator } from "$lib/components/ui/separator";
    import * as Tooltip from "$lib/components/ui/tooltip";
    import type { InsertCWLClan } from "$lib/server/schema";
    import type { GridOptions } from "@ag-grid-community/core";
    import { Control, Description, Field, FieldErrors } from "formsnap";
    import { toast } from "svelte-sonner";
    import { fade, fly } from "svelte/transition";
    import { superForm } from "sveltekit-superforms";
    import { zodClient } from "sveltekit-superforms/adapters";
    import LucideCloud from "~icons/lucide/cloud";
    import LucideCloudAlert from "~icons/lucide/cloud-alert";
    import LucideCloudUpload from "~icons/lucide/cloud-upload";
    import LucideLoaderCircle from "~icons/lucide/loader-circle";
    import LucideRefreshCw from "~icons/lucide/refresh-cw";
    import LucideTrash from "~icons/lucide/trash";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    let rowData = $derived<InsertCWLClan[]>(data.clans);
    let disabled: boolean = $state(false);
    let loading: boolean = $state(false);
    let syncing: "success" | "loading" | "error" = $state("success");
    let syncClan: boolean = $state(false);
    let syncSpin: boolean = $state(false);

    let reset = $state<() => void>();
    const form = superForm(data.form, {
        validators: zodClient(cwlClanFormSchema),
        onUpdated() {
            reset?.();
        }
    });
    const { form: formData, enhance, message, delayed, errors } = form;
    let openTooltip: boolean[] = $state(Array(Object.keys(cwlClanForm).length).fill(false));
    $effect(() => {
        if ($message && (page.status === 200 || page.status == 400)) {
            switch (page.status) {
                case 200:
                    toast.success($message);
                    break;
                case 400:
                    toast.error($message);
                    break;
            }
        }
    });

    const gridOptions: GridOptions<InsertCWLClan> = {
        columnDefs: [
            {
                field: "tag",
                filter: true
            },
            {
                field: "clanName",
                filter: true
            },
            {
                field: "cwl",
                headerName: "Clan War League",
                filter: true
            },
            {
                field: "leader",
                filter: true
            }
        ],
        autoSizeStrategy: {
            type: "fitCellContents",
            skipHeader: false
        },
        pagination: true,
        paginationAutoPageSize: true,
        rowSelection: {
            mode: "multiRow"
        },
        onRowSelected(event) {
            selectedRows = event.api.getSelectedRows();
        },
        async onCellValueChanged(event) {
            let updatedRow = event.data;

            const hasEmptyField = Object.values(updatedRow).some((value) => value === undefined || value === null || value === "");
            if (hasEmptyField) {
                toast.error("All fields must be filled before updating a clan.");
                syncing = "error";
                invalidateAll();
                return;
            }

            syncing = "loading";
            let response = await fetch(`/api/clans`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: "update_cwl_clan",
                    value: updatedRow
                })
            });
            if (response.ok) {
                syncing = "success";
                invalidateAll();
            } else {
                syncing = "error";
                const data = await response.json();
                toast.error(data.error || "Failed to update clan");
                invalidateAll();
            }
        }
    };

    let selectedRows: InsertCWLClan[] = $state([]);

    async function removeClan(tags: string[]) {
        disabled = true;
        loading = true;
        let response = await fetch(`/api/clans`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                key: "remove_cwl_clan",
                value: tags
            })
        });
        if (response.ok) {
            invalidateAll();
        } else {
            toast.error("Failed to remove clan");
        }
        selectedRows = [];
        loading = false;
        setTimeout(() => {
            disabled = false;
        }, 500);
    }

    async function syncClans() {
        syncClan = true;
        syncSpin = true;
        let resp = await fetch("/api/clans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "sync_cwl_clans" })
        });
        if (resp.ok) {
            toast.success("Clans have been synced");
        } else {
            const data = await resp.json();
            toast.error(data.error);
        }
        syncSpin = false;
        setTimeout(() => {
            syncClan = false;
        }, 5000);
    }
</script>

<Card.Root>
    <Card.Header>
        <Card.Title class="text-2xl font-bold">Add CWL Clan</Card.Title>
        <Card.Description>Fill out the form below to add a new cwl clan.</Card.Description>
    </Card.Header>
    <Card.Content>
        <form method="POST" action="/admin/cwl/clans" use:enhance class="flex flex-col gap-4">
            <div class="flex w-full flex-wrap items-start justify-center gap-2">
                {#each Object.keys(cwlClanForm) as key, idx}
                    <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                        <Field {form} name={key as keyof typeof $formData}>
                            <Description>{cwlClanForm[key].desc}</Description>
                            <Tooltip.Provider>
                                <Tooltip.Root delayDuration={0} bind:open={openTooltip[idx]} disableCloseOnTriggerClick>
                                    <Tooltip.Trigger class="flex w-full grow">
                                        <Control>
                                            {#snippet children({ props })}
                                                <input type="hidden" name={key} bind:value={$formData[key as keyof typeof $formData]} />
                                                <Input
                                                    {...props}
                                                    onclick={() => (openTooltip[idx] = !openTooltip[idx])}
                                                    type={cwlClanForm[key].type}
                                                    placeholder={cwlClanForm[key].placeholder}
                                                    bind:value={$formData[key as keyof typeof $formData]}
                                                />
                                            {/snippet}
                                        </Control>
                                    </Tooltip.Trigger>
                                    <Tooltip.Portal>
                                        <Tooltip.Content class={$errors[key as keyof typeof $formData] ? "" : "hidden"}>
                                            <FieldErrors />
                                        </Tooltip.Content>
                                    </Tooltip.Portal>
                                </Tooltip.Root>
                            </Tooltip.Provider>
                        </Field>
                    </div>
                {/each}
            </div>
            <Button disabled={$delayed} type="submit" class={$delayed ? "cursor-wait" : ""}>
                {#if $delayed}
                    <span in:fly class="flex size-full items-center justify-center gap-2">
                        <LucideLoaderCircle class="size-5 animate-spin"></LucideLoaderCircle>
                        Submitting...
                    </span>
                {:else}
                    <span in:fly class="flex size-full items-center justify-center">Submit</span>
                {/if}
            </Button>
        </form>
    </Card.Content>
</Card.Root>

<Separator class="my-4" />

<div class="flex size-full flex-col gap-4">
    <div class="flex w-full items-center justify-between">
        <div class="flex items-center justify-center gap-2">
            <h1 class="text-2xl font-bold">CWL Clans</h1>
            <div class="size-8">
                {#if syncing === "success"}
                    <span in:fade class="size-full">
                        <LucideCloud class="size-full text-green-500" />
                    </span>
                {:else if syncing === "loading"}
                    <span in:fade class="size-full">
                        <LucideCloudUpload class="size-full text-yellow-500" />
                    </span>
                {:else if syncing === "error"}
                    <span in:fade class="size-full">
                        <LucideCloudAlert class="size-full text-red-500" />
                    </span>
                {/if}
            </div>
        </div>
        <div class="flex items-center justify-center gap-2">
            <Button size="icon" onclick={syncClans} disabled={syncClan}>
                <LucideRefreshCw class={syncSpin ? "animate-spin" : ""} />
            </Button>
            <Button
                size="icon"
                variant="destructive"
                disabled={selectedRows.length <= 0 || disabled}
                onclick={async () => {
                    await removeClan(selectedRows.map((row) => row.tag));
                }}
            >
                {#if loading}
                    <span in:fade={{ duration: 100 }}>
                        <LucideLoaderCircle class="animate-spin" />
                    </span>
                {:else}
                    <span in:fade={{ duration: 100 }}>
                        <LucideTrash />
                    </span>
                {/if}
            </Button>
        </div>
    </div>
    <Grid {gridOptions} bind:rowData />
</div>
