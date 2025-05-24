<script lang="ts">
    import { Tooltip } from "bits-ui";
    import type { APIRole, APIUser } from "discord-api-types/v10";
    import { expoIn, expoOut } from "svelte/easing";
    import { fly } from "svelte/transition";
    import MaterialSymbolsCloseRounded from "~icons/material-symbols/close-rounded";
    import MaterialSymbolsSendRounded from "~icons/material-symbols/send-rounded";
    import Button from "$lib/components/app/ui/Button.svelte";

    interface Props {
        title: string;
        placeholder: string;
        inputValue: string;
        onSubmit: () => void;
        items: APIRole[] | APIUser[];
        removeItem: (id: string) => void;
    }
    let { title = "", placeholder = "", inputValue = $bindable(""), onSubmit = () => {}, items = [], removeItem = () => {} }: Props = $props();

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

<div class="flex flex-col items-start justify-center gap-2">
    <span>{title}</span>
    <div class="flex items-center gap-2">
        <input {placeholder} maxlength="19" bind:value={inputValue} disabled={disabledInput} />
        <Button class="p-2" onclick={handleSubmit} disabled={disabledButton}>
            <MaterialSymbolsSendRounded class="size-6" />
        </Button>
    </div>
    <div class="flex flex-wrap gap-2 overflow-hidden">
        {#each items as item}
            <div
                in:fly={{ duration: 500, easing: expoIn, x: -100, y: 0 }}
                out:fly={{ duration: 500, easing: expoOut, x: 100, y: 0 }}
                class="flex flex-col gap-1 rounded-xl border border-gray-700 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 p-2"
            >
                <div class="flex items-center justify-start gap-2" class:opacity-50={disabledInput}>
                    <button
                        onclick={() => handleRemove(item.id)}
                        disabled={disabledInput}
                        class="group flex items-center justify-center rounded-full bg-gray-500 bg-cover text-gray-950 disabled:cursor-not-allowed"
                        class:size-4={isRole(item)}
                        class:size-6={!isRole(item)}
                        style={isRole(item)
                            ? `background-color: #${item.color}`
                            : `background-image: url(https://media.discordapp.net/avatars/${item.id}/${item.avatar});`}
                    >
                        <div
                            class="flex size-full items-center justify-center rounded-full p-0.5 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 group-disabled:opacity-0!"
                        >
                            <MaterialSymbolsCloseRounded class="size-fit" />
                        </div>
                    </button>
                    <Tooltip.Provider>
                        <Tooltip.Root delayDuration={200}>
                            {@const itemName = isRole(item) ? item.name : item.global_name || item.username}
                            <Tooltip.Trigger class="cursor-default">
                                <p>{itemName.length >= 10 ? `${itemName.slice(0, 10)}...` : itemName}</p>
                            </Tooltip.Trigger>
                            <Tooltip.Content
                                class="rounded-lg border border-gray-700 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 p-2 text-sm"
                            >
                                <p>{itemName}</p>
                            </Tooltip.Content>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                </div>
                <span class="text-xs text-gray-400">{item.id}</span>
            </div>
        {/each}
    </div>
</div>
