<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { cn } from "$lib/utils";
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        open?: boolean;
        trigger?: Snippet;
        children: Snippet;
        class?: string;
    }
    let { title, open = $bindable(false), trigger, children, class: className }: Props = $props();

    let popupStyle =
        "font-coc border border-background bg-linear-to-b from-muted via-primary-background to-primary-background shadow-[0_0_5px_0.5px_var(--tw-shadow-color)] shadow-background";
</script>

<Dialog.Root bind:open>
    {#if trigger}
        <Dialog.Trigger class="font-coc">
            {@render trigger()}
        </Dialog.Trigger>
    {/if}
    <Dialog.Content class={cn(popupStyle, className)}>
        <Dialog.Header class="font-coc">
            <Dialog.Title class="font-coc text-xl font-extrabold">{title}</Dialog.Title>
        </Dialog.Header>
        {@render children()}
    </Dialog.Content>
</Dialog.Root>
