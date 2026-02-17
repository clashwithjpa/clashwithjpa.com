<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { page } from "$app/state";
    import CWLTable from "$lib/components/admin/CWLTable.svelte";
    import { Button } from "$lib/components/ui/button";
    import * as Dialog from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import * as Select from "$lib/components/ui/select";
    import { customCWLEntrySchema } from "$lib/schema";
    import type { InsertCWL } from "$lib/server/schema";
    import { Control, Description, Field, FieldErrors } from "formsnap";
    import { json2csv } from "json-2-csv";
    import { toast } from "svelte-sonner";
    import { fade, fly } from "svelte/transition";
    import { superForm } from "sveltekit-superforms";
    import { zodClient } from "sveltekit-superforms/adapters";
    import LucideCheck from "~icons/lucide/check";
    import LucideCloud from "~icons/lucide/cloud";
    import LucideCloudAlert from "~icons/lucide/cloud-alert";
    import LucideCloudUpload from "~icons/lucide/cloud-upload";
    import LucideDownload from "~icons/lucide/download";
    import LucideLoaderCircle from "~icons/lucide/loader-circle";
    import LucidePlus from "~icons/lucide/plus";
    import LucideTrash from "~icons/lucide/trash";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    let rowData = $state<InsertCWL[]>([]);
    $effect(() => {
        rowData = data.cwlApplications;
    });
    let disabled: boolean = $state(false);
    let loading: boolean = $state(false);
    let syncing: "success" | "loading" | "error" = $state("success");
    let openPopup: boolean = $state(false);
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
    const formInstance = $derived.by(() =>
        superForm(data.form, {
            validators: zodClient(customCWLEntrySchema as any),
            onUpdated() {
                reset?.();
            }
        })
    );
    const formData = $derived(formInstance.form);
    const enhance = $derived(formInstance.enhance);
    const message = $derived(formInstance.message);
    const delayed = $derived(formInstance.delayed);
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

    // Extra actions
    let selectedAssignClan: string = $state("");
    let checkLoading: boolean = $state(false);

    const updateApplication = async (updatedRow: InsertCWL | InsertCWL[]) => {
        disabled = true;
        syncing = "loading";
        let key = Array.isArray(updatedRow) ? "update_multi_applications" : "update_application";
        let value = Array.isArray(updatedRow)
            ? updatedRow.map((row) => ({ ...row, appliedAt: new Date(row.appliedAt ?? "") }))
            : { ...updatedRow, appliedAt: new Date(updatedRow.appliedAt ?? "") };
        let response = await fetch(`/api/cwl`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value })
        });
        if (response.ok) {
            syncing = "success";
            invalidateAll();
        } else {
            syncing = "error";
            toast.error("Failed to update application");
        }
        disabled = false;
        selectedRows = [];
        selectedAssignClan = "";
    };
</script>

<Dialog.Root bind:open={openPopup}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>New CWL Application</Dialog.Title>
        </Dialog.Header>
        <form in:fade method="POST" action="/admin/cwl" use:enhance class="flex flex-col items-stretch justify-center gap-2">
            <div class="flex w-full flex-wrap items-start justify-center gap-2">
                <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                    <Field form={formInstance} name="tag">
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
                    <Field form={formInstance} name="userId">
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
                    <Field form={formInstance} name="accountWeight">
                        <Description>Account Weight</Description>
                        <Control>
                            {#snippet children({ props })}
                                <input type="hidden" name="accountWeight" bind:value={$formData.accountWeight} />
                                <Input {...props} placeholder="1" min={1} type="number" bind:value={$formData.accountWeight} />
                            {/snippet}
                        </Control>
                        <FieldErrors class="text-destructive text-sm" />
                    </Field>
                </div>
                <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                    <Field form={formInstance} name="preferenceNum">
                        <Description>Preference Number</Description>
                        <Control>
                            {#snippet children({ props })}
                                <input type="hidden" name="preferenceNum" bind:value={$formData.preferenceNum} />
                                <Input {...props} placeholder="1" min={1} type="number" bind:value={$formData.preferenceNum} />
                            {/snippet}
                        </Control>
                        <FieldErrors class="text-destructive text-sm" />
                    </Field>
                </div>
                <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                    <Field form={formInstance} name="accountClan">
                        <Description>Account Clan</Description>
                        <Control>
                            {#snippet children({ props })}
                                <input type="hidden" name="accountClan" bind:value={$formData.accountClan} />
                                <Select.Root type="single" value={$formData.accountClan as string} onValueChange={(v) => ($formData.accountClan = v)}>
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
                        "Assigned To": data.cwlClans.find((clan) => clan.tag === row.assignedTo)?.clanName || "",
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
                <LucideDownload />
            </Button>
            <Button size="icon" {disabled} onclick={() => (openPopup = true)}>
                <LucidePlus />
            </Button>
            <Button
                size="icon"
                variant="destructive"
                disabled={selectedRows.length <= 0 || disabled}
                onclick={async () => {
                    await removeApp(selectedRows.map((row) => row.accountTag));
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
    <div class="size-full">
        <CWLTable
            bind:rowData
            cwlClans={data.cwlClans}
            clanNames={data.clanNames.filter((name): name is string => name !== null)}
            editable={true}
            onCellValueChanged={updateApplication}
            onSortChanged={(sortedData) => {
                rowData = sortedData;
            }}
            onRowSelected={(rows) => {
                selectedRows = rows;
            }}
        />
    </div>
    <div class="flex w-full items-center justify-between">
        <div class="flex items-center justify-start gap-2">
            <Select.Root
                type="single"
                bind:value={selectedAssignClan}
                disabled={selectedRows.length <= 0 || disabled}
                onValueChange={(value) => {
                    selectedRows.forEach((row) => {
                        row.assignedTo = value === "Unassigned" ? null : data.cwlClans.find((clan) => clan.clanName === value)?.tag || null;
                    });
                }}
            >
                <Select.Trigger>
                    {selectedAssignClan ? selectedAssignClan : "Select CWL Clan"}
                </Select.Trigger>
                <Select.Content>
                    {#each data.cwlClans as clan}
                        <Select.Item value={clan.clanName} label={clan.clanName} />
                    {/each}
                    <Select.Item value="Unassigned" label="Unassigned" />
                </Select.Content>
            </Select.Root>
        </div>
        <Button
            size="icon"
            disabled={selectedRows.length <= 0 || disabled}
            onclick={async () => {
                checkLoading = true;
                await updateApplication(selectedRows);
                checkLoading = false;
            }}
        >
            {#if checkLoading}
                <span in:fade={{ duration: 100 }}>
                    <LucideLoaderCircle class="animate-spin" />
                </span>
            {:else}
                <span in:fade={{ duration: 100 }}>
                    <LucideCheck />
                </span>
            {/if}
        </Button>
    </div>
</div>
