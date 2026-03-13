<script lang="ts">
    import ControlsPopup from "$lib/components/ControlsPopup.svelte";
    import "./layout.css";

    let { children } = $props();
</script>

<div class="flex h-screen w-screen flex-col overflow-x-hidden">
    {@render children()}
</div>

<ControlsPopup />
