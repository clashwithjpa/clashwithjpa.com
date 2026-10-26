<script lang="ts">
    import RoleBadge from "#lib/components/ui/RoleBadge.svelte";

    let { role }: { role: string | null | undefined } = $props();
</script>

{#if role}
    <RoleBadge {role} />
{/if}
