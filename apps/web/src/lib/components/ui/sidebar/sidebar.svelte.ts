import type { Snippet } from "svelte";

export const sidebarStore = $state<{
    isOpen: boolean;
    content: Snippet | null;
    contentKey: string | null;
    open: (content: Snippet, key?: string) => void;
    close: () => void;
    toggle: () => void;
}>({
    isOpen: false,
    content: null,
    contentKey: null,

    open(content, key) {
        this.content = content;
        this.contentKey = key ?? null;
        this.isOpen = true;
    },

    close() {
        this.isOpen = false;
        this.content = null;
        this.contentKey = null;
    },

    toggle() {
        this.isOpen = !this.isOpen;
        this.content = this.isOpen ? this.content : null;
        this.contentKey = this.isOpen ? this.contentKey : null;
    },
});
