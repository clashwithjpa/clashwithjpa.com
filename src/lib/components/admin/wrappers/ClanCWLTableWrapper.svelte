<script lang="ts">
    import type { ICellRendererParams } from "@ag-grid-community/core";

    let params: ICellRendererParams = $props();

    const clanTag = $derived(params.data?.assignedTo);
    const cwlClans = $derived((params as any).cwlClans || []);
    const clanName = $derived(clanTag ? cwlClans.find((clan: any) => clan.tag === clanTag)?.clanName || "Unknown Clan" : "Not Assigned");
</script>

{#if clanTag}
    <a
        href="https://link.clashofclans.com/en?action=OpenClanProfile&tag={clanTag.slice(1)}"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sky-500 hover:underline"
    >
        {clanName}
    </a>
{:else}
    <span class="text-muted-foreground">{clanName}</span>
{/if}
