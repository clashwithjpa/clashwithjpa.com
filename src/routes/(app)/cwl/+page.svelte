<script lang="ts">
    import { dev } from "$app/environment";
    import { page } from "$app/state";
    import { PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public";
    import { toast } from "$lib/components/app/toast";
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import * as Select from "$lib/components/ui/select";
    import { Switch } from "$lib/components/ui/switch";
    import * as Tooltip from "$lib/components/ui/tooltip";
    import { cwlApplicationSchema } from "$lib/schema";
    import { textOverflow } from "$lib/utils";
    import { Control, Description, Field, FieldErrors } from "formsnap";
    import { Turnstile } from "svelte-turnstile";
    import { expoOut } from "svelte/easing";
    import { fade, fly } from "svelte/transition";
    import SuperDebug, { superForm } from "sveltekit-superforms";
    import { zodClient } from "sveltekit-superforms/adapters";
    import MaterialSymbolsChevronLeftRounded from "~icons/material-symbols/chevron-left-rounded";
    import MaterialSymbolsChevronRightRounded from "~icons/material-symbols/chevron-right-rounded";
    import TablerLoader2 from "~icons/tabler/loader-2";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
    let showPrevApps: boolean = $state(false);

    const form = superForm(data.form, {
        validators: zodClient(cwlApplicationSchema),
        onUpdated() {
            reset?.();
        }
    });
    $effect(() => {
        if (data.userAccount.cocAccounts.length <= 1) {
            $formData.preferenceNum = 1;
        }
    });

    const { form: formData, enhance, message, delayed } = form;
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

    let reset = $state<() => void>();

    let buttonDisabled = $derived.by(() => {
        return dev ? false : !$formData.tag || !$formData.preferenceNum || !$formData["cf-turnstile-response"];
    });
</script>

<svelte:head>
    <title>JPA | CWL Application</title>
</svelte:head>

<main class="flex size-full flex-col items-center justify-center">
    <div class="flex h-screen w-screen items-center justify-center lg:justify-start">
        <div
            class="fixed -z-10 h-full w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat lg:relative lg:z-10 lg:flex lg:w-1/2"
            style="background-image: url('/cwl.webp');"
        >
            {#if dev}
                <div class="w-full p-5">
                    <SuperDebug data={$formData} />
                </div>
            {/if}
        </div>
        <div
            class="bg-background/80 flex size-full flex-col items-center justify-center backdrop-blur-xs lg:w-1/2 lg:bg-transparent lg:backdrop-blur-none"
        >
            {#if showPrevApps}
                <div in:fade class="flex size-full flex-col justify-center">
                    <h3 class="text-center text-xl">Previous Application{data.applications.length > 1 ? "s" : ""}</h3>
                    <ul class="mt-5 flex max-h-[60%] flex-col gap-2 overflow-y-scroll rounded-xl px-5">
                        {#each Object.entries(data.applications.reduce((acc: { [key: string]: typeof data.applications }, app) => {
                                const date = new Date(app.appliedAt).toLocaleString("en-IN", { month: "long", day: "numeric", year: "numeric" });
                                if (!acc[date]) acc[date] = [];
                                acc[date].push(app);
                                return acc;
                            }, {})) as [date, applications]}
                            <li class="flex w-full flex-col items-start justify-center">
                                <p class="text-muted-foreground flex w-full items-center">
                                    {date}
                                    <span class="border-muted-foreground mx-2 grow rounded-xl border-t"></span>
                                </p>
                                <ul class="mt-2 flex w-full flex-wrap items-center justify-center gap-2">
                                    {#each applications as application}
                                        <Card.Root>
                                            <Card.Header style="container-type: inherit;">
                                                <Card.Title class="flex items-center justify-center gap-4">
                                                    <div class="flex w-full items-center justify-between gap-5">
                                                        <div class="flex items-center justify-center gap-1">
                                                            <span class="flex flex-col items-start justify-center">
                                                                <Tooltip.Provider>
                                                                    <Tooltip.Root>
                                                                        <Tooltip.Trigger>
                                                                            <p>
                                                                                {textOverflow(application.accountName, 8)}
                                                                            </p>
                                                                        </Tooltip.Trigger>
                                                                        <Tooltip.Content>
                                                                            <p>{application.accountName}</p>
                                                                        </Tooltip.Content>
                                                                    </Tooltip.Root>
                                                                </Tooltip.Provider>
                                                                <p class="text-xs">{application.accountTag}</p>
                                                            </span>
                                                        </div>
                                                        <p class="text-muted-foreground text-sm">
                                                            {new Date(application.appliedAt).toLocaleTimeString("en-IN", {
                                                                hour: "numeric",
                                                                minute: "numeric"
                                                            })}
                                                        </p>
                                                    </div>
                                                </Card.Title>
                                            </Card.Header>
                                            <Card.Content class="text-sm">
                                                <p>
                                                    <span class="text-muted-foreground font-bold">Clan:</span>
                                                    {application.accountClan}
                                                </p>
                                                <p>
                                                    <span class="text-muted-foreground font-bold">Preference Number:</span>
                                                    {application.preferenceNum}
                                                </p>
                                                <p>
                                                    <span class="text-muted-foreground font-bold">Account Weight:</span>
                                                    {application.accountWeight}
                                                </p>
                                            </Card.Content>
                                        </Card.Root>
                                    {/each}
                                </ul>
                            </li>
                        {/each}
                    </ul>
                </div>
            {:else}
                {#await data.cocData}
                    <div in:fade class="flex w-full max-w-lg items-center justify-center px-5">
                        <TablerLoader2 class="size-10 animate-spin" />
                    </div>
                {:then coc}
                    <form in:fade method="POST" action="/cwl" use:enhance class="flex w-full max-w-lg flex-col gap-2 px-5">
                        <Field {form} name="isAlt">
                            <div class="flex items-center justify-start gap-2">
                                <Description>Account not in JPA Clans (Alt)?</Description>
                                <Control>
                                    {#snippet children({ props })}
                                        <input type="hidden" name="isAlt" bind:value={$formData.isAlt} />
                                        <Switch {...props} name="CWLStatus" bind:checked={$formData.isAlt} />
                                    {/snippet}
                                </Control>
                                <FieldErrors class="text-red-400 text-sm" />
                            </div>
                        </Field>

                        <Field {form} name="tag">
                            <Description>Select one of your accounts</Description>
                            <Control>
                                {#snippet children({ props })}
                                    <input type="hidden" name="tag" bind:value={$formData.tag} />
                                    <Select.Root type="single" bind:value={$formData.tag}>
                                        <Select.Trigger class="w-full" {...props}
                                            >{$formData.tag ? $formData.tag : "Select an account"}</Select.Trigger
                                        >
                                        <Select.Content>
                                            {#each coc as acc}
                                                <Select.Item value={acc?.tag ?? ""} label="{acc?.tag ?? ''} - {acc?.name ?? ''}" />
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                {/snippet}
                            </Control>
                            <FieldErrors class="text-red-400 text-sm" />
                        </Field>

                        <Field {form} name="preferenceNum">
                            {@const accounts = data.userAccount.cocAccounts.length}
                            <Description>Preference number {accounts > 1 ? `( 1 - ${accounts} )` : ``}</Description>
                            <Control>
                                {#snippet children({ props })}
                                    <input type="hidden" name="preferenceNum" bind:value={$formData.preferenceNum} />
                                    <Input
                                        {...props}
                                        type="number"
                                        placeholder="1"
                                        min="1"
                                        max={accounts}
                                        disabled={accounts <= 1}
                                        bind:value={$formData.preferenceNum}
                                    />
                                {/snippet}
                            </Control>
                            <FieldErrors class="text-red-400 text-sm" />
                        </Field>

                        {#if $formData.isAlt}
                            <Field {form} name="accountClan">
                                <Description>Clan Name</Description>
                                <Control>
                                    {#snippet children({ props })}
                                        <input type="hidden" name="accountClan" bind:value={$formData.accountClan} />
                                        <Select.Root type="single" bind:value={$formData.accountClan}>
                                            <Select.Trigger class="w-full" {...props}
                                                >{$formData.accountClan ? $formData.accountClan : "Select a clan"}</Select.Trigger
                                            >
                                            <Select.Content>
                                                {#each data.clanNames as clanName}
                                                    <Select.Item value={clanName ?? ""} label={clanName ?? ""} />
                                                {/each}
                                            </Select.Content>
                                        </Select.Root>
                                    {/snippet}
                                </Control>
                                <FieldErrors class="text-red-400 text-sm" />
                            </Field>

                            <Field {form} name="accountWeight">
                                <Description>Account Weight</Description>
                                <Control>
                                    {#snippet children({ props })}
                                        <input type="hidden" name="accountWeight" bind:value={$formData.accountWeight} />
                                        <Input {...props} type="number" placeholder="0" min={0} bind:value={$formData.accountWeight} />
                                    {/snippet}
                                </Control>
                                <FieldErrors class="text-red-400 text-sm" />
                            </Field>
                        {/if}

                        {#if !dev}
                            <Field {form} name="cf-turnstile-response">
                                <Turnstile
                                    class="text-center"
                                    on:callback={(event) => {
                                        $formData["cf-turnstile-response"] = event.detail.token;
                                    }}
                                    siteKey={PUBLIC_TURNSTILE_SITE_KEY}
                                    bind:reset
                                />
                            </Field>
                        {/if}

                        <Button class={$delayed ? "cursor-wait" : ""} disabled={buttonDisabled || $delayed} type="submit">
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
                {/await}
            {/if}
            {#if data.applications.length}
                <div class="fixed bottom-0 w-full max-w-lg p-5 lg:w-1/2">
                    <Button size="lg" class="w-full" variant="outline" onclick={() => (showPrevApps = !showPrevApps)}>
                        {#if showPrevApps}
                            <span in:fly={{ duration: 500, easing: expoOut, x: -100, y: 0 }} class="flex items-center justify-center gap-2">
                                <MaterialSymbolsChevronLeftRounded class="size-6 transition-transform group-hover:-translate-x-1.5 " />
                                <span>Back to form</span>
                            </span>
                        {:else}
                            <span in:fly={{ duration: 500, easing: expoOut, x: 100, y: 0 }} class="flex items-center justify-center gap-2">
                                <span>
                                    Check previous application{data.applications.length > 1 ? "s" : ""}
                                </span>
                                <MaterialSymbolsChevronRightRounded class="size-6 transition-transform group-hover:translate-x-1.5 " />
                            </span>
                        {/if}
                    </Button>
                </div>
            {/if}
        </div>
    </div>
</main>
