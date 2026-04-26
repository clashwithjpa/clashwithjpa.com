import type { Snippet } from "svelte";

export const sidebarStore = $state<{
    isOpen: boolean;
    content: Snippet | null;
    open: () => void;
    close: () => void;
    toggle: () => void;
}>({
    isOpen: false,
    content: null,

    open() {
        this.isOpen = true;
    },

    close() {
        this.isOpen = false;
    },

    toggle() {
        this.isOpen = !this.isOpen;
    },
});
