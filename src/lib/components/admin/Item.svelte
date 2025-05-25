<script lang="ts">
    import * as Avatar from "$lib/components/ui/avatar";
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import type { APIRole, APIUser } from "discord-api-types/v10";
    import { toast } from "svelte-sonner";
    import { expoIn, expoOut } from "svelte/easing";
    import { fly } from "svelte/transition";
    import LucideSend from "~icons/lucide/send";
    import LucideX from "~icons/lucide/x";

    interface Props {
        title: string;
        description: string;
        placeholder: string;
        inputValue: string;
        onSubmit: () => void;
        items: APIRole[] | APIUser[];
        removeItem: (id: string) => void;
    }
    let {
        title,
        description,
        placeholder = "",
        inputValue = $bindable(""),
        onSubmit = () => {},
        items = [],
        removeItem = () => {}
    }: Props = $props();

    let disabledInput: boolean = $state(false);
    let disabledButton: boolean = $state(false);

    $effect(() => {
        if (inputValue.length <= 0 || items.find((item) => item.id === inputValue)) {
            disabledButton = true;
        } else {
            disabledButton = false;
        }
    });

    const isRole = (item: APIRole | APIUser): item is APIRole => {
        return (item as APIRole).name !== undefined;
    };

    async function handleSubmit() {
        disabledInput = true;
        disabledButton = true;
        await onSubmit();
        disabledInput = false;
        disabledButton = false;
    }

    async function handleRemove(id: string) {
        disabledInput = true;
        disabledButton = true;
        await removeItem(id);
        disabledInput = false;
        disabledButton = false;
    }
</script>

<div class="flex flex-col items-start justify-center gap-6">
    <div class="flex w-full flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
            <h2 class="text-2xl font-bold">{title}</h2>
            <p class="text-muted-foreground text-sm">{description}</p>
        </div>
        <div class="flex items-center justify-center gap-2">
            <Input {placeholder} max="19" bind:value={inputValue} disabled={disabledInput} />
            <Button size="icon" onclick={handleSubmit} disabled={disabledButton}>
                <LucideSend />
            </Button>
        </div>
    </div>
    <div class="flex w-full flex-wrap gap-4 overflow-hidden">
        {#each items as item}
            {@const isARole = isRole(item)}
            <div
                class="w-full md:w-60"
                in:fly={{ duration: 500, easing: expoIn, x: -100, y: 0 }}
                out:fly={{ duration: 500, easing: expoOut, x: 100, y: 0 }}
            >
                <Card.Root
                    class="w-full p-4"
                    onclick={(e) => {
                        if (e.target instanceof HTMLButtonElement) return;
                        navigator.clipboard.writeText(item.id);
                        toast.success("Copied ID to clipboard");
                    }}
                >
                    <Card.Header style="container-type: inherit;" class="p-0">
                        <Card.Title>
                            <div class="flex items-center gap-4">
                                <Avatar.Root class="size-12 rounded-lg">
                                    <Avatar.Image
                                        src={isARole
                                            ? `https://singlecolorimage.com/get/${item.color}/40x40`
                                            : `https://media.discordapp.net/avatars/${item.id}/${item.avatar}`}
                                        alt={isARole ? String(item.color) : item.global_name}
                                    />
                                    <Avatar.Fallback class="rounded-lg">
                                        {`${isARole ? item.name : item.global_name || item.username}`?.slice(0, 2).toUpperCase()}
                                    </Avatar.Fallback>
                                </Avatar.Root>
                                <div class="grid flex-1 text-left text-sm">
                                    <span class="truncate font-medium">{isARole ? item.name : item.global_name || item.username}</span>
                                    {#if !isARole}
                                        <span class="truncate text-xs opacity-50">{item.username}</span>
                                    {/if}
                                </div>
                                <Button size="icon" variant="secondary" onclick={() => handleRemove(item.id)} disabled={disabledInput}>
                                    <LucideX />
                                </Button>
                            </div>
                        </Card.Title>
                    </Card.Header>
                </Card.Root>
            </div>
        {/each}
    </div>
</div>
