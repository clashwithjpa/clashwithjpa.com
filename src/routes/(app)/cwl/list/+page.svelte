<script lang="ts">
    import CWLTable from "$lib/components/admin/CWLTable.svelte";
    import { Button } from "$lib/components/ui/button";
    import type { InsertCWL } from "$lib/server/schema";
    import { json2csv } from "json-2-csv";
    import MaterialSymbolsDownloadRounded from "~icons/material-symbols/download-rounded";

    let { data } = $props<{ data: any }>();
    let rowData = $state<InsertCWL[]>([]);

    $effect(() => {
        rowData = data.cwlApplications;
    });
</script>

<svelte:head>
    <title>JPA | CWL Applications</title>
</svelte:head>

<main class="flex size-full flex-col items-center justify-center p-5">
    <div class="flex size-full max-w-7xl flex-col gap-5">
        <div class="flex w-full items-center justify-between">
            <div class="flex w-full items-center justify-between pt-20">
                <div class="flex items-center justify-center gap-2">
                    <h1 class="text-2xl font-bold">CWL Applications</h1>
                </div>
                <Button
                    size="icon"
                    disabled={rowData.length <= 0}
                    onclick={() => {
                        const csvRow = rowData.map((row) => ({
                            "User Name": row.userName,
                            "Preference Number": row.preferenceNum,
                            "Account Name": row.accountName,
                            "Account Tag": row.accountTag,
                            "Account Clan": row.accountClan,
                            "Assigned To": data.cwlClans.find((clan: any) => clan.tag === row.assignedTo)?.clanName || "",
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
                    <MaterialSymbolsDownloadRounded />
                </Button>
            </div>
        </div>
        <div class="size-full">
            <CWLTable
                bind:rowData
                cwlClans={data.cwlClans}
                editable={false}
                currentUserId={data.userId}
                onSortChanged={(sortedData) => {
                    rowData = sortedData;
                }}
            />
        </div>
    </div>
</main>
