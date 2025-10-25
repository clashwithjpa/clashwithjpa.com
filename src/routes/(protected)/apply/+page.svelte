<script lang="ts">
    import { dev } from "$app/environment";
    import { page } from "$app/state";
    import { PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public";
    import { toast } from "$lib/components/app/toast";
    import { Button } from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import { Input } from "$lib/components/ui/input";
    import * as Tooltip from "$lib/components/ui/tooltip";
    import { clanApplicationSchema } from "$lib/schema";
    import { Control, Description, Field, FieldErrors } from "formsnap";
    import { Turnstile } from "svelte-turnstile";
    import { expoOut } from "svelte/easing";
    import { fade, fly } from "svelte/transition";
    import SuperDebug, { superForm } from "sveltekit-superforms";
    import { zodClient } from "sveltekit-superforms/adapters";
    import MaterialSymbolsCancelRounded from "~icons/material-symbols/cancel-rounded";
    import MaterialSymbolsCheckCircle from "~icons/material-symbols/check-circle";
    import MaterialSymbolsChevronLeftRounded from "~icons/material-symbols/chevron-left-rounded";
    import MaterialSymbolsChevronRightRounded from "~icons/material-symbols/chevron-right-rounded";
    import MaterialSymbolsWarningRounded from "~icons/material-symbols/warning-rounded";
    import TablerLoader2 from "~icons/tabler/loader-2";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    const form = superForm(data.form, {
        validators: zodClient(clanApplicationSchema),
        onUpdated() {
            reset?.();
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

    let buttonDisabled = $derived.by(() => {
        return dev ? false : !$formData.tag || !$formData.apiToken || !$formData["cf-turnstile-response"];
    });

    let showPrevApps: boolean = $state(false);

    let pendingApps = $derived.by(() => {
        return Object.keys(data.applications.filter((app) => app.status === "pending")).length;
    });

    let reset = $state<() => void>();
</script>

<svelte:head>
    <title>JPA | Apply</title>
</svelte:head>

<main class="flex size-full flex-col items-center justify-center">
    <div class="flex h-screen w-screen items-center justify-center lg:justify-start">
        <div
            class="fixed -z-10 h-full w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat lg:relative lg:z-10 lg:flex lg:w-1/2"
            style="background-image: url('/apply.webp');"
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
            {#if data.applications.length && showPrevApps}
                <div in:fade class="flex size-full flex-col justify-center">
                    <h3 class="text-center text-xl">Previous Application{data.applications.length > 1 ? "s" : ""}</h3>
                    <ul class="mt-5 flex max-h-[60%] flex-col gap-2 overflow-y-scroll rounded-xl px-5">
                        {#each Object.entries(data.applications.reduce((acc: { [key: string]: typeof data.applications }, app) => {
                                const date = new Date(app.createdAt).toLocaleString("en-IN", { month: "long", day: "numeric", year: "numeric" });
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
                                                    <span
                                                        class:text-red-400={application.status === "rejected"}
                                                        class:text-yellow-400={application.status === "pending"}
                                                        class:text-green-400={application.status === "accepted"}
                                                    >
                                                        <Tooltip.Provider>
                                                            <Tooltip.Root>
                                                                <Tooltip.Trigger>
                                                                    {#if application.status === "accepted"}
                                                                        <MaterialSymbolsCheckCircle class="size-10" />
                                                                    {:else if application.status === "rejected"}
                                                                        <MaterialSymbolsCancelRounded class="size-10" />
                                                                    {:else if application.status === "pending"}
                                                                        <MaterialSymbolsWarningRounded class="size-10" />
                                                                    {/if}
                                                                </Tooltip.Trigger>
                                                                <Tooltip.Content>
                                                                    {application.status.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase())}
                                                                </Tooltip.Content>
                                                            </Tooltip.Root>
                                                        </Tooltip.Provider>
                                                    </span>
                                                    <span class="flex min-w-0 flex-col items-start justify-center">
                                                        <Tooltip.Provider>
                                                            <Tooltip.Root>
                                                                <Tooltip.Trigger class="min-w-0">
                                                                    <p class="max-w-[120px] truncate text-left">
                                                                        {application.playerData.name}
                                                                    </p>
                                                                </Tooltip.Trigger>
                                                                <Tooltip.Content>
                                                                    <p>{application.playerData.name}</p>
                                                                </Tooltip.Content>
                                                            </Tooltip.Root>
                                                        </Tooltip.Provider>
                                                        <p class="w-full truncate text-xs">{application.tag}</p>
                                                    </span>
                                                    <p class="text-muted-foreground text-xs">
                                                        {new Date(application.createdAt).toLocaleTimeString("en-IN", {
                                                            hour: "numeric",
                                                            minute: "numeric"
                                                        })}
                                                    </p>
                                                </Card.Title>
                                            </Card.Header>
                                        </Card.Root>
                                    {/each}
                                </ul>
                            </li>
                        {/each}
                    </ul>
                </div>
            {:else}
                <form in:fade method="POST" action="/apply" use:enhance class="flex w-full max-w-lg flex-col gap-2 px-5">
                    <Field {form} name="tag">
                        <Description>Your account tag (include #)</Description>
                        <Control>
                            {#snippet children({ props })}
                                <input type="hidden" name="tag" bind:value={$formData.tag} />
                                <Input {...props} type="text" placeholder="#ABCDEFGHI" bind:value={$formData.tag} />
                            {/snippet}
                        </Control>
                        <FieldErrors class="text-sm text-red-400" />
                    </Field>
                    <Field {form} name="apiToken">
                        <Description>Your API token</Description>
                        <Control>
                            {#snippet children({ props })}
                                <input type="hidden" name="apiToken" bind:value={$formData.apiToken} />
                                <Input {...props} type="text" placeholder="API Token" bind:value={$formData.apiToken} />
                            {/snippet}
                        </Control>
                        <FieldErrors class="text-sm text-red-400" />
                    </Field>
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
                                    {#if pendingApps}
                                        {pendingApps} Pending
                                    {:else}
                                        Check
                                    {/if} application{data.applications.length > 1 ? "s" : ""}
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
