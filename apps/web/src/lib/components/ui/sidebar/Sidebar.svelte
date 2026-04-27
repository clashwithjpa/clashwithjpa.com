<script lang="ts">
    import type { Snippet } from "svelte";
    import { sidebarStore } from "./sidebar.svelte";

    interface Props {
        children: Snippet;
    }
    let { children }: Props = $props();
    export function open(key?: string) {
        sidebarStore.open(children, key);
    }

    export function close() {
        sidebarStore.close();
    }

    export function toggle() {
        sidebarStore.toggle();
    }

    export function isOpenFor(key?: string) {
        return sidebarStore.isOpen && sidebarStore.contentKey === key;
    }
</script>
