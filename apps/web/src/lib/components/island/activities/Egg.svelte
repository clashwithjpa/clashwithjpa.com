<script lang="ts">
    import Pill from "./Pill.svelte";

    let { art, text, sub }: { art: string; text: string; sub?: string } = $props();
</script>

<Pill title={text} subtitle={sub}>
    {#snippet lead()}
        <img src={art} alt="" class="size-10 max-w-none object-contain" />
    {/snippet}
</Pill>
