<script lang="ts">
    import { sidebarStore } from "$lib/stores/sidebar.svelte";
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
    }
    let { children }: Props = $props();

    $effect(() => {
        sidebarStore.content = children;

        return () => {
            if (sidebarStore.content === children) {
                sidebarStore.content = null;
                sidebarStore.close();
            }
        };
    });
</script>
