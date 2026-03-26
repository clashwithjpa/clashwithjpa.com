<script lang="ts">
    import ControlsPopup from "$lib/components/ControlsPopup.svelte";
    import "@cartamd/plugin-anchor/default.css";
    import "@cartamd/plugin-code/default.css";
    import "@cartamd/plugin-emoji/default.css";
    import "@cartamd/plugin-slash/default.css";
    import "carta-md/default.css";
    import "./layout.css";

    let { children } = $props();
</script>

<div class="flex h-screen w-screen flex-col overflow-x-hidden">
    {@render children()}
</div>

<ControlsPopup />
