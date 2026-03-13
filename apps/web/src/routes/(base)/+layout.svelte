<script lang="ts">
    import Navbar from "$lib/components/Navbar.svelte";
    import "./layout.css";

    let { children } = $props();
</script>

<Navbar />

<div class="min-h-0 flex-1 overflow-auto p-2 md:p-4">
    {@render children()}
</div>
