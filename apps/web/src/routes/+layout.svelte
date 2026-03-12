<script lang="ts">
    import "./layout.css";

    let { children } = $props();
</script>

<div class="flex h-screen w-screen flex-col overflow-x-hidden">
    {@render children()}
</div>
