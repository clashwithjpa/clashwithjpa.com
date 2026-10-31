<script lang="ts">
    import type { AuditResolver, Segment } from "#lib/config/auditLog.js";
    import AuditMention from "./AuditMention.svelte";
    import AuditValueView from "./AuditValueView.svelte";

    let { segments, resolver }: { segments: Segment[]; resolver: AuditResolver } = $props();
</script>

{#each segments as seg, i (i)}{#if typeof seg === "string"}{seg}{:else if "entity" in seg}<AuditMention
            entity={seg.entity}
            fallback={seg.fallback}
            {resolver}
        />{:else}<AuditValueView field={seg.field} value={seg.value} {resolver} />{/if}{/each}
