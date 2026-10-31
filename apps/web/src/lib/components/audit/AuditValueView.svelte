<script lang="ts">
    import { FIELDS, formatValue, isRef, type AuditResolver, type AuditValue } from "#lib/config/auditLog.js";
    import { cn } from "#lib/utils.js";
    import AuditMention from "./AuditMention.svelte";

    let {
        field,
        value,
        resolver,
        muted = false,
    }: { field: string; value: AuditValue | undefined; resolver: AuditResolver; muted?: boolean } = $props();

    const empty = $derived(value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0));
    const hidden = $derived(FIELDS[field]?.kind === "hidden");
</script>

{#if empty}
    <span class="text-stone-500">none</span>
{:else if isRef(value!)}
    <AuditMention entity={{ type: value.ref, id: value.id }} {resolver} />
{:else if hidden}
    <span class="text-stone-400 italic">hidden</span>
{:else}
    <span class={cn("wrap-break-word", muted ? "text-stone-500" : "font-semibold text-stone-50")}>{formatValue(field, value, resolver)}</span>
{/if}
