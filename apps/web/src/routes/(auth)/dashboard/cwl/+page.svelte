<script lang="ts">
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import { authClient } from "$lib/auth";
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import type { Option } from "$lib/components/ui/Select.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { cardSlideIn, fadeIn } from "$lib/utils/animations";
    import { Field } from "@ark-ui/svelte/field";
    import { applyCwl, getCOCPlayer, getJPAClans, getUserAccounts } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import SvgSpinnersBlocksScale from "~icons/svg-spinners/blocks-scale";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";

    let session = authClient.useSession();
    let options: (Option & { warWeight: number; clanTag?: string; isExternal: boolean })[] = $state([]);
    let clanOptions: Option[] = $state([]);

    let tag = $state("");
    let preferenceNum = $state<number>(1);
    let accountClan = $state("");

    let selectedAccountWeight = $derived(tag ? (options.find((o) => o.value === tag)?.warWeight ?? null) : null);
    // Alt/external status comes from the account itself, not a manual checkbox.
    let selectedIsExternal = $derived(tag ? (options.find((o) => o.value === tag)?.isExternal ?? false) : false);

    $effect(() => {
        if (selectedIsExternal || !tag) return;
        const selected = options.find((o) => o.value === tag);
        if (!selected?.clanTag) return;
        const match = clanOptions.find((c) => c.value === selected.clanTag);
        if (match) accountClan = match.value;
    });

    let isLoading = $state(false);
    let fieldErrors = $state<Record<string, string>>({});

    type ApiError = {
        path: string[];
        message: string;
    };

    const parseErrors = (error: unknown): Record<string, string> => {
        const errors: Record<string, string> = {};

        if (Array.isArray(error)) {
            error.forEach((err: ApiError) => {
                const fieldName = err.path?.[0];
                errors[fieldName] = err.message;
            });
        }

        return errors;
    };

    async function setOptions() {
        const accs = await getUserAccounts({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
        const accsInfo = await Promise.all(
            accs.data.accounts.map(async (acc) => {
                try {
                    const playerData = await getCOCPlayer(encodeURIComponent(acc.cocAccountTag), {
                        baseURL: PUBLIC_SERVER_URL,
                        credentials: "include",
                    });
                    return {
                        tag: acc.cocAccountTag,
                        name: playerData.data.player.name,
                        icon: `th/${playerData.data.player.townHallLevel}`,
                        warWeight: acc.warWeight,
                        clanTag: playerData.data.player.clan?.tag,
                        isExternal: acc.isExternal,
                    };
                } catch (e) {
                    return {
                        tag: acc.cocAccountTag,
                        name: acc.cocAccountTag,
                        icon: undefined,
                        warWeight: acc.warWeight,
                        clanTag: undefined,
                        isExternal: acc.isExternal,
                    };
                }
            }),
        );
        options = accsInfo.map((acc) => ({
            label: `${acc.tag} - ${acc.name}${acc.isExternal ? " (External)" : ""}`,
            value: acc.tag,
            icon: acc.icon,
            warWeight: acc.warWeight,
            clanTag: acc.clanTag,
            isExternal: acc.isExternal,
        }));
    }

    async function setClanOptions() {
        const clans = await getJPAClans({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
        Object.values(clans.data.clans).forEach((clan) => {
            clanOptions.push({ label: `${clan.clanTag} - ${clan.clanName}`, value: clan.clanTag });
        });
    }

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        fieldErrors = {};

        if (!tag) {
            toast.error("Please select an account tag");
            return;
        }
        if (!selectedIsExternal && !accountClan.trim()) {
            toast.error("Account clan is required");
            return;
        }

        isLoading = true;
        try {
            const data = await applyCwl(
                {
                    tag,
                    preferenceNum,
                    accountClan: selectedIsExternal ? null : accountClan,
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include", headers: { "Content-Type": "application/json" } },
            );

            if (data.success) {
                const selectedOption = options.find((o) => o.value === tag);
                toast.success(`CWL Application for ${selectedOption?.label || tag} submitted successfully!`);
                tag = "";
                preferenceNum = 1;
                accountClan = "";
                fieldErrors = {};
            } else {
                console.log(data);
                const errorData = (data as any).error;

                if (Array.isArray(errorData)) {
                    fieldErrors = parseErrors(errorData);
                    toast.error("Failed to submit CWL application");
                } else if (typeof errorData === "string") {
                    toast.error(errorData);
                } else {
                    toast.error("Failed to submit CWL application");
                }
            }
        } catch (err: any) {
            toast.error(err?.message || "Failed to submit CWL application");
            console.error("Submit error:", err);
        } finally {
            isLoading = false;
        }
    };
</script>

<Seo title="Clan War League" description="Apply for Clan War League and manage your application." />

<div in:fadeIn class="grid size-full grid-cols-1 gap-4 p-4 md:grid-cols-2">
    {#await Promise.all([setOptions(), setClanOptions()])}
        <div class="flex size-full flex-col items-center justify-center gap-2 text-stone-400 opacity-50">
            <SvgSpinnersBlocksScale class="size-12 lg:size-16" />
        </div>
    {:then}
        <div use:cardSlideIn class="flex size-full flex-col justify-center gap-8 lg:p-8">
            <div class="flex flex-col gap-1">
                <h1 class="text-4xl font-bold">Clan War League</h1>
                <p class="text-sm text-stone-400">Apply to participate in Clan War League.</p>
            </div>

            <form onsubmit={handleSubmit} class="flex flex-col gap-6">
                <Field.Root required invalid={!!fieldErrors.tag} class="flex flex-col gap-1">
                    <Field.Label class="text-sm font-medium">Select Account</Field.Label>
                    <Select bind:value={tag} {options} placeholder="Select a linked account" disabled={isLoading} />
                    {#if fieldErrors.tag}
                        <Field.ErrorText class="text-xs text-red-400">{fieldErrors.tag}</Field.ErrorText>
                    {/if}
                </Field.Root>

                {#if !selectedIsExternal}
                    <Field.Root required invalid={!!fieldErrors.accountClan} class="flex flex-col gap-1">
                        <Field.Label class="text-sm font-medium">Account Clan</Field.Label>
                        <Select
                            bind:value={accountClan}
                            options={clanOptions}
                            placeholder="Select the clan you want to participate with"
                            disabled={isLoading}
                        />
                        {#if fieldErrors.accountClan}
                            <Field.ErrorText class="text-xs text-red-400">{fieldErrors.accountClan}</Field.ErrorText>
                        {/if}
                    </Field.Root>
                {/if}

                {#if selectedAccountWeight !== null}
                    <div class="flex flex-col gap-1">
                        <span class="text-sm font-medium">Account Weight</span>
                        <span class="rounded-lg border-2 border-stone-700/50 bg-stone-900/50 px-4 py-2 text-base text-stone-300"
                            >{selectedAccountWeight.toLocaleString()}</span
                        >
                        <span class="text-xs text-stone-400">Using saved war weight from your account</span>
                    </div>
                {/if}

                <Field.Root required invalid={!!fieldErrors.preferenceNum} class="flex flex-col gap-1">
                    <Field.Label class="text-sm font-medium">Preference Number</Field.Label>
                    <Input
                        bind:value={preferenceNum}
                        type="number"
                        placeholder="1"
                        min={1}
                        max={options.length}
                        disabled={isLoading}
                        aria-invalid={!!fieldErrors.preferenceNum}
                    />
                    {#if fieldErrors.preferenceNum}
                        <Field.ErrorText class="text-xs text-red-400">{fieldErrors.preferenceNum}</Field.ErrorText>
                    {:else}
                        <Field.HelperText class="text-xs text-stone-400"
                            >Lower number means higher preference for CWL bonus if signing up with multiple accounts</Field.HelperText
                        >
                    {/if}
                </Field.Root>

                <Button type="submit" disabled={isLoading || !tag || (!selectedIsExternal && !accountClan)}>
                    {#if isLoading}
                        <span class="flex items-center justify-center gap-2">
                            <SvgSpinnersRingResize class="size-4" /> Submitting...
                        </span>
                    {:else}
                        <span> Submit CWL Application </span>
                    {/if}
                </Button>
            </form>
        </div>
    {/await}
    <div class="hidden h-full rounded-xl bg-cover bg-center bg-no-repeat md:flex" style="background-image: url('/cwl_bg.webp')"></div>
</div>
