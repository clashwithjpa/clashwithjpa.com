<script lang="ts">
    import type { ICellRendererParams } from "@ag-grid-community/core";
    import LucideExternalLink from "~icons/lucide/external-link";

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
        class="inline-flex items-center gap-1.5 text-sky-500 transition-colors hover:text-sky-600 hover:underline"
    >
        <span>{clanName}</span>
        <LucideExternalLink class="size-3.5 opacity-70" />
    </a>
{:else}
    <span class="text-muted-foreground">{clanName}</span>
{/if}
