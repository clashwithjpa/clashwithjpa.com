<script lang="ts">
    import { fieldLabel, type AuditChange, type AuditResolver } from "#lib/config/auditLog.js";
    import TablerArrowRight from "~icons/tabler/arrow-right";
    import AuditValueView from "./AuditValueView.svelte";

    let { changes, resolver }: { changes: AuditChange[]; resolver: AuditResolver } = $props();
</script>

<!-- One line per field: old value faded, new value bright. A create has no old value, a delete no new one. -->
<dl class="flex flex-col divide-y divide-stone-800 text-sm">
    {#each changes as c (c.field)}
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0">
            <dt class="text-stone-400">{fieldLabel(c.field)}</dt>
            <dd class="flex min-w-0 flex-wrap items-center justify-end gap-x-1.5 text-right">
                {#if "before" in c && "after" in c}
                    <AuditValueView field={c.field} value={c.before} {resolver} muted />
                    <TablerArrowRight class="size-3.5 shrink-0 text-stone-500" />
                    <AuditValueView field={c.field} value={c.after} {resolver} />
                {:else if "after" in c}
                    <AuditValueView field={c.field} value={c.after} {resolver} />
                {:else}
                    <AuditValueView field={c.field} value={c.before} {resolver} muted />
                {/if}
            </dd>
        </div>
    {/each}
</dl>
