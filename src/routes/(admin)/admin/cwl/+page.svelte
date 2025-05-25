<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { page } from "$app/state";
    import Grid from "$lib/components/admin/Grid.svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import * as Select from "$lib/components/ui/select";
    import UserNameCWLFormsWrapper from "$lib/components/admin/wrappers/UserNameCWLFormsWrapper.svelte";
    import { customCWLEntrySchema } from "$lib/schema";
    import type { InsertCWL } from "$lib/server/schema";
    import type { GridOptions, IDateFilterParams, ValueFormatterParams } from "@ag-grid-community/core";
    import { makeSvelteCellRenderer } from "ag-grid-svelte5-extended";
    import { Control, Description, Field, FieldErrors } from "formsnap";
    import { json2csv } from "json-2-csv";
    import { toast } from "svelte-sonner";
    import { fade, fly } from "svelte/transition";
    import { superForm } from "sveltekit-superforms";
    import { zodClient } from "sveltekit-superforms/adapters";
    import LucideCloud from "~icons/lucide/cloud";
    import LucideCloudAlert from "~icons/lucide/cloud-alert";
    import LucideCloudUpload from "~icons/lucide/cloud-upload";
    import LucideFileText from "~icons/lucide/file-text";
    import LucideLoaderCircle from "~icons/lucide/loader-circle";
    import LucidePlus from "~icons/lucide/plus";
    import LucideTrash from "~icons/lucide/trash";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    let rowData = $derived<InsertCWL[]>(data.cwlApplications);
    let disabled: boolean = $state(false);
    let loading: boolean = $state(false);
    let syncing: "success" | "loading" | "error" = $state("success");
    let openPopup: boolean = $state(false);

    const filterParams: IDateFilterParams = {
        comparator: (filterDate: Date, cellValue: string) => {
            const cellDate = new Date(cellValue).getDate();
            if (cellDate < filterDate.getDate()) {
                return -1;
            } else if (cellDate > filterDate.getDate()) {
                return 1;
            }
            return 0;
        }
    };

    const gridOptions: GridOptions<InsertCWL> = {
        columnDefs: [
            {
                field: "userName",
                cellRenderer: makeSvelteCellRenderer(UserNameCWLFormsWrapper),
                filter: true,
                filterParams: {
                    filterPlaceholder: "Search by Discord Username"
                }
            },
            {
                field: "preferenceNum",
                headerName: "P.N",
                headerTooltip: "Preference Number",
                filter: "agNumberColumnFilter",
                editable: true
            },
            { field: "accountName", filter: true },
            { field: "accountTag", filter: true },
            {
                field: "accountClan",
                filter: true,
                editable: true,
                cellEditor: "agSelectCellEditor",
                cellEditorParams: {
                    values: data.clanNames
                }
            },
            { field: "accountWeight", filter: "agNumberColumnFilter", editable: true },
            {
                field: "appliedAt",
                valueFormatter: (params: ValueFormatterParams<any, Date>) => {
                    return new Date(params.data?.appliedAt || "").toLocaleString("en-IN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                    });
                },
                headerName: "Applied At",
                filter: "agDateColumnFilter",
                filterParams,
                editable: true,
                cellEditor: "agDateCellEditor",
                cellDataType: "date"
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
            const [month, year] = new Date(updatedRow.appliedAt ?? "").toLocaleDateString("en-US", { month: "long", year: "numeric" }).split(" ");
            updatedRow.month = month;
            updatedRow.year = year as unknown as number;
            syncing = "loading";
            let response = await fetch(`/api/cwl`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: "update_application",
                    value: updatedRow
                })
            });
            if (response.ok) {
                syncing = "success";
                invalidateAll();
            } else {
                syncing = "error";
                toast.error("Failed to update application");
            }
        }
    };

    let selectedRows: InsertCWL[] = $state([]);

    async function removeApp(tags: string[]) {
        disabled = true;
        loading = true;
        let response = await fetch(`/api/cwl`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                key: "delete_application",
                value: tags
            })
        });
        if (response.ok) {
            invalidateAll();
        } else {
            toast.error("Failed to remove application");
        }
        selectedRows = [];
        loading = false;
        setTimeout(() => {
            disabled = false;
        }, 500);
    }

    // New CWL Form
    const form = superForm(data.form, {
        validators: zodClient(customCWLEntrySchema),
        onUpdated() {
            reset?.();
        }
    });

    const { form: formData, enhance, message, delayed } = form;
    $effect(() => {
        if ($message && (page.status === 200 || page.status == 400)) {
            switch (page.status) {
                case 200:
                    openPopup = false;
                    toast.success($message);
                    break;
                case 400:
                    toast.error($message);
                    break;
            }
        }
    });

    let reset = $state<() => void>();
</script>

<Dialog.Root bind:open={openPopup}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>New CWL Application</Dialog.Title>
        </Dialog.Header>
        <form in:fade method="POST" action="/admin/cwl" use:enhance class="flex flex-col items-stretch justify-center gap-2">
            <div class="flex w-full flex-wrap items-start justify-center gap-2">
                <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                    <Field {form} name="tag">
                        <Description>Account Tag</Description>
                        <Control>
                            {#snippet children({ props })}
                                <input type="hidden" name="tag" bind:value={$formData.tag} />
                                <Input {...props} placeholder="Account Tag" bind:value={$formData.tag} />
                            {/snippet}
                        </Control>
                        <FieldErrors class="text-destructive text-sm" />
                    </Field>
                </div>
                <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                    <Field {form} name="userId">
                        <Description>User ID</Description>
                        <Control>
                            {#snippet children({ props })}
                                <input type="hidden" name="userId" bind:value={$formData.userId} />
                                <Input {...props} placeholder="Discord User ID" bind:value={$formData.userId} />
                            {/snippet}
                        </Control>
                        <FieldErrors class="text-destructive text-sm" />
                    </Field>
                </div>
                <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                    <Field {form} name="accountWeight">
                        <Description>Account Weight</Description>
                        <Control>
                            {#snippet children({ props })}
                                <input type="hidden" name="accountWeight" bind:value={$formData.accountWeight} />
                                <Input {...props} placeholder="1" min={1} bind:value={$formData.accountWeight} />
                            {/snippet}
                        </Control>
                        <FieldErrors class="text-destructive text-sm" />
                    </Field>
                </div>
                <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                    <Field {form} name="preferenceNum">
                        <Description>Preference Number</Description>
                        <Control>
                            {#snippet children({ props })}
                                <input type="hidden" name="preferenceNum" bind:value={$formData.preferenceNum} />
                                <Input {...props} placeholder="1" min={1} bind:value={$formData.preferenceNum} />
                            {/snippet}
                        </Control>
                        <FieldErrors class="text-destructive text-sm" />
                    </Field>
                </div>
                <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                    <Field {form} name="accountClan">
                        <Description>Account Clan</Description>
                        <Control>
                            {#snippet children({ props })}
                                <input type="hidden" name="accountClan" bind:value={$formData.accountClan} />
                                <Select.Root type="single" bind:value={$formData.accountClan}>
                                    <Select.Trigger class="w-full" {...props}
                                        >{$formData.accountClan ? $formData.accountClan : "Select a clan"}</Select.Trigger
                                    >
                                    <Select.Content>
                                        {#each data.clanNames as clanName}
                                            <Select.Item value={clanName ?? ""} label={clanName ?? ""} />
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                            {/snippet}
                        </Control>
                        <FieldErrors class="text-destructive text-sm" />
                    </Field>
                </div>
            </div>
            <Button class={$delayed ? "cursor-wait" : ""} disabled={$delayed} type="submit">
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
    </Dialog.Content>
</Dialog.Root>

<div class="flex size-full flex-col gap-5">
    <div class="flex w-full items-center justify-between">
        <div class="flex items-center justify-center gap-2">
            <h1 class="text-2xl font-bold">CWL</h1>
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
            <Button
                size="icon"
                disabled={rowData.length <= 0 || disabled}
                onclick={() => {
                    const csvRow = rowData.map((row) => ({
                        "User Name": row.userName,
                        "Preference Number": row.preferenceNum,
                        "Account Name": row.accountName,
                        "Account Tag": row.accountTag,
                        "Account Clan": row.accountClan,
                        "Account Weight": row.accountWeight,
                        "Applied At": new Date(row.appliedAt || "").toLocaleString("en-IN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit"
                        })
                    }));
                    const csv = json2csv(csvRow);
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "cwl.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                }}
            >
                <div class="size-6">
                    <LucideFileText class="size-full" />
                </div>
            </Button>
            <Button size="icon" {disabled} onclick={() => (openPopup = true)}>
                <div class="size-6">
                    <LucidePlus class="size-full" />
                </div>
            </Button>
            <Button
                size="icon"
                variant="destructive"
                disabled={selectedRows.length <= 0 || disabled}
                onclick={async () => {
                    await removeApp(selectedRows.map((row) => row.accountTag));
                }}
            >
                <div in:fade class="size-6">
                    {#if loading}
                        <span class="size-full">
                            <LucideLoaderCircle class="size-full animate-spin" />
                        </span>
                    {:else}
                        <span class="size-full">
                            <LucideTrash class="size-full" />
                        </span>
                    {/if}
                </div>
            </Button>
        </div>
    </div>
    <div class="size-full">
        <Grid {gridOptions} bind:rowData />
    </div>
</div>
