<script lang="ts">
    import TablerAlertTriangle from "~icons/tabler/alert-triangle";
    import TablerCheck from "~icons/tabler/check";
    import TablerExclamationMark from "~icons/tabler/exclamation-mark";
    import TablerInfoSmall from "~icons/tabler/info-small";
    import Pill from "./Pill.svelte";

    let {
        message,
        description,
        tone = "success",
    }: { message: string; description?: string; tone?: "success" | "info" | "neutral" | "warning" | "error" } = $props();
</script>

{#snippet icon()}
    {#if tone === "success"}
        <span class="grid size-8 place-items-center rounded-full bg-green-900 text-green-200"><TablerCheck class="size-4" /></span>
    {:else if tone === "error"}
        <span class="grid size-8 place-items-center rounded-full bg-red-900 text-red-200"><TablerExclamationMark class="size-4" /></span>
    {:else if tone === "warning"}
        <span class="grid size-8 place-items-center rounded-full bg-amber-900 text-amber-200"><TablerAlertTriangle class="size-4" /></span>
    {:else}
        <span class="grid size-8 place-items-center rounded-full bg-sky-900 text-sky-200"><TablerInfoSmall class="size-6" /></span>
    {/if}
{/snippet}

<Pill title={message} subtitle={description} lead={tone === "neutral" ? undefined : icon} class={tone === "neutral" ? "pl-5" : ""} />
