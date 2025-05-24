<script lang="ts">
    import { page } from "$app/state";
    import { clanForm, clanFormSchema } from "$lib/coc/schema";
    import { Button } from "$lib/components/admin/ui/button";
    import * as Card from "$lib/components/admin/ui/card";
    import { Input } from "$lib/components/admin/ui/input";
    import * as Tooltip from "$lib/components/admin/ui/tooltip";
    import { Control, Description, Field, FieldErrors } from "formsnap";
    import { toast } from "svelte-sonner";
    import { fly } from "svelte/transition";
    import { superForm } from "sveltekit-superforms";
    import { zodClient } from "sveltekit-superforms/adapters";
    import TablerLoader2 from "~icons/tabler/loader-2";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    let reset = $state<() => void>();
    const form = superForm(data.form, {
        validators: zodClient(clanFormSchema),
        onUpdated() {
            reset?.();
        }
    });
    const { form: formData, enhance, message, delayed, errors } = form;
    let openTooltip: boolean[] = $state(Array(Object.keys(clanForm).length).fill(false));
    $effect(() => {
        if ($message && (page.status === 200 || page.status == 400)) {
            switch (page.status) {
                case 200:
                    toast.success($message);
                    break;
                case 400:
                    toast.error($message);
                    break;
            }
        }
    });
</script>

<Card.Root>
    <Card.Header>
        <Card.Title class="text-2xl font-bold">Add Clan</Card.Title>
        <Card.Description>Fill out the form below to add a new clan.</Card.Description>
    </Card.Header>
    <Card.Content>
        <form method="POST" action="/admin/clans" use:enhance class="flex flex-col gap-4">
            <div class="flex w-full flex-wrap items-start justify-center gap-2">
                {#each Object.keys(clanForm) as key, idx}
                    <div class="flex w-full grow cursor-default flex-col gap-2 md:w-fit">
                        <Field {form} name={key as keyof typeof $formData}>
                            <Description>{clanForm[key].desc}</Description>
                            <Tooltip.Provider>
                                <Tooltip.Root delayDuration={0} bind:open={openTooltip[idx]} disableCloseOnTriggerClick>
                                    <Tooltip.Trigger class="flex w-full grow">
                                        <Control>
                                            {#snippet children({ props })}
                                                <Input
                                                    {...props}
                                                    onclick={() => (openTooltip[idx] = !openTooltip[idx])}
                                                    type={clanForm[key].type}
                                                    placeholder={clanForm[key].placeholder}
                                                    bind:value={$formData[key as keyof typeof $formData]}
                                                />
                                                <input type="hidden" name={key} bind:value={$formData[key as keyof typeof $formData]} />
                                            {/snippet}
                                        </Control>
                                    </Tooltip.Trigger>
                                    <Tooltip.Portal>
                                        <Tooltip.Content class={$errors[key as keyof typeof $formData] ? "" : "hidden"}>
                                            <FieldErrors />
                                        </Tooltip.Content>
                                    </Tooltip.Portal>
                                </Tooltip.Root>
                            </Tooltip.Provider>
                        </Field>
                    </div>
                {/each}
            </div>
            <Button disabled={$delayed} type="submit" class={$delayed ? "cursor-wait" : ""}>
                {#if $delayed}
                    <span in:fly class="flex size-full items-center justify-center gap-2">
                        <TablerLoader2 class="size-5 animate-spin"></TablerLoader2>
                        Submitting...
                    </span>
                {:else}
                    <span in:fly class="flex size-full items-center justify-center">Submit</span>
                {/if}
            </Button>
        </form>
    </Card.Content>
</Card.Root>
