<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { page } from "$app/state";
    import UserNameCWLFormsWrapper from "$lib/components/admin/wrappers/UserNameCWLFormsWrapper.svelte";
    import { toast } from "svelte-sonner";
    import { Button } from "$lib/components/admin/ui/button";
    import Grid from "$lib/components/admin/Grid.svelte";
    import PopupDialog from "$lib/components/app/ui/PopupDialog.svelte";
    import { customCWLEntrySchema } from "$lib/schema";
    import type { InsertCWL } from "$lib/server/schema";
    import type { GridOptions, IDateFilterParams, ValueFormatterParams } from "@ag-grid-community/core";
    import { makeSvelteCellRenderer } from "ag-grid-svelte5-extended";
    import { Control, Description, Field, FieldErrors } from "formsnap";
    import { json2csv } from "json-2-csv";
    import { fade, fly } from "svelte/transition";
    import { superForm } from "sveltekit-superforms";
    import { zodClient } from "sveltekit-superforms/adapters";
    import MaterialSymbolsAdd2Rounded from "~icons/material-symbols/add-2-rounded";
    import MaterialSymbolsCloudAlertRounded from "~icons/material-symbols/cloud-alert-rounded";
    import MaterialSymbolsCloudDoneRounded from "~icons/material-symbols/cloud-done-rounded";
    import MaterialSymbolsCloudSyncRounded from "~icons/material-symbols/cloud-sync-rounded";
    import MaterialSymbolsDeleteRounded from "~icons/material-symbols/delete-rounded";
    import MaterialSymbolsDocumentScanner from "~icons/material-symbols/document-scanner";
    import TablerLoader2 from "~icons/tabler/loader-2";
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

<PopupDialog title="New CWL Application" bind:open={openPopup}>
    <form in:fade method="POST" action="/admin/cwl" use:enhance class="flex flex-col items-stretch justify-center gap-2">
        <div class="flex w-full flex-wrap items-start justify-center gap-2">
            <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                <Field {form} name="tag">
                    <Description>Account Tag</Description>
                    <Control>
                        {#snippet children({ props })}
                            <input {...props} placeholder="Account Tag" bind:value={$formData.tag} />
                        {/snippet}
                    </Control>
                    <FieldErrors class="text-red-400" />
                </Field>
            </div>
            <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                <Field {form} name="userId">
                    <Description>User ID</Description>
                    <Control>
                        {#snippet children({ props })}
                            <input {...props} placeholder="Discord User ID" bind:value={$formData.userId} />
                        {/snippet}
                    </Control>
                    <FieldErrors class="text-red-400" />
                </Field>
            </div>
            <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                <Field {form} name="accountClan">
                    <Description>Account Clan</Description>
                    <Control>
                        {#snippet children({ props })}
                            <select {...props} bind:value={$formData.accountClan}>
                                <option value="" disabled selected hidden>Select a clan</option>
                                {#each data.clanNames as clanName}
                                    <option class="bg-gray-900" value={clanName}>{clanName}</option>
                                {/each}
                            </select>
                        {/snippet}
                    </Control>
                    <FieldErrors class="text-red-400" />
                </Field>
            </div>
            <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                <Field {form} name="accountWeight">
                    <Description>Account Weight</Description>
                    <Control>
                        {#snippet children({ props })}
                            <input {...props} type="number" placeholder="1" min={1} bind:value={$formData.accountWeight} />
                        {/snippet}
                    </Control>
                    <FieldErrors class="text-red-400" />
                </Field>
            </div>
            <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                <Field {form} name="preferenceNum">
                    <Description>Preference Number</Description>
                    <Control>
                        {#snippet children({ props })}
                            <input {...props} type="number" placeholder="1" min={1} bind:value={$formData.preferenceNum} />
                        {/snippet}
                    </Control>
                    <FieldErrors class="text-red-400" />
                </Field>
            </div>
        </div>
        <Button class="px-4 py-3 text-sm {$delayed ? 'cursor-wait' : ''}" disabled={$delayed} type="submit">
            {#if $delayed}
                <span in:fly class="flex size-full items-center justify-center gap-2">
                    <TablerLoader2 class="size-5 animate-spin"></TablerLoader2>
                    Submitting...
                </span>
            {:else}
                <span in:fly class="flex size-full items-center justify-center">Submit</span>
            {/if}
        </Button>
    </form>
</PopupDialog>

<div class="flex size-full flex-col gap-5 p-5 md:p-11">
    <div class="flex w-full items-center justify-between">
        <div class="flex items-center justify-center gap-2">
            <h1 class="text-3xl font-bold md:text-4xl">CWL</h1>
            <div class="size-8">
                {#if syncing === "success"}
                    <span in:fade class="size-full">
                        <MaterialSymbolsCloudDoneRounded class="size-full text-green-500" />
                    </span>
                {:else if syncing === "loading"}
                    <span in:fade class="size-full">
                        <MaterialSymbolsCloudSyncRounded class="size-full text-yellow-500" />
                    </span>
                {:else if syncing === "error"}
                    <span in:fade class="size-full">
                        <MaterialSymbolsCloudAlertRounded class="size-full text-red-500" />
                    </span>
                {/if}
            </div>
        </div>
        <div class="flex items-center justify-center gap-2">
            <Button
                size="sm"
                class="flex items-center justify-center gap-2"
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
                    <MaterialSymbolsDocumentScanner class="size-full" />
                </div>
            </Button>
            <Button size="sm" class="flex items-center justify-center gap-2" {disabled} onclick={() => (openPopup = true)}>
                <div class="size-6">
                    <MaterialSymbolsAdd2Rounded class="size-full" />
                </div>
            </Button>
            <Button
                size="sm"
                class="flex items-center justify-center gap-2 hover:not-disabled:!bg-red-500/10 hover:not-disabled:!text-red-500"
                disabled={selectedRows.length <= 0 || disabled}
                onclick={async () => {
                    await removeApp(selectedRows.map((row) => row.accountTag));
                }}
            >
                <div in:fade class="size-6">
                    {#if loading}
                        <span class="size-full">
                            <TablerLoader2 class="size-full animate-spin" />
                        </span>
                    {:else}
                        <span class="size-full">
                            <MaterialSymbolsDeleteRounded class="size-full" />
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
