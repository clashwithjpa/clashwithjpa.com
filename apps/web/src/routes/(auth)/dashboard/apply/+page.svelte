<script lang="ts">
    import { PUBLIC_SERVER_URL, PUBLIC_TURNSTILE_SITE_KEY } from "$env/static/public";
    import Button from "$lib/components/ui/Button.svelte";
    import Input from "$lib/components/ui/Input.svelte";
    import Seo from "$lib/components/ui/Seo.svelte";
    import { fadeIn } from "$lib/utils/animations";
    import { Field } from "@ark-ui/svelte/field";
    import { applyUserAccount, type ApplyUserAccount500 } from "@repo/clashofclans-client";
    import { toast } from "svelte-sonner";
    import { Turnstile } from "svelte-turnstile";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";

    let cocAccountTag = $state("");
    let apiToken = $state("");
    let captchaToken = $state<string | null>(null);
    let reset = $state<() => void>();
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

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        fieldErrors = {};

        if (!cocAccountTag.trim()) {
            toast.error("Clan tag is required");
            return;
        }

        if (!cocAccountTag.startsWith("#")) {
            toast.error("Clan tag must start with #");
            return;
        }

        if (!apiToken.trim()) {
            toast.error("API token is required");
            return;
        }

        if (!captchaToken) {
            toast.error("Please complete the captcha verification");
            return;
        }

        isLoading = true;
        try {
            const data = await applyUserAccount(
                {
                    cocAccountTag,
                    apiToken,
                    captchaToken,
                },
                { baseURL: PUBLIC_SERVER_URL, credentials: "include" },
            );

            if (data.success) {
                toast.success("Application submitted successfully!");
                cocAccountTag = "";
                apiToken = "";
                fieldErrors = {};
            } else {
                console.log(data);
                const errorData = (data as unknown as ApplyUserAccount500).error;

                if (Array.isArray(errorData)) {
                    fieldErrors = parseErrors(errorData);
                    toast.error("Failed to submit application");
                } else if (typeof errorData === "string") {
                    toast.error(errorData);
                } else {
                    toast.error("Failed to submit application");
                }
            }
        } catch (err: any) {
            toast.error(err?.message || "Failed to submit application");
            console.error("Submit error:", err);
        } finally {
            captchaToken = null;
            reset?.();
            isLoading = false;
        }
    };
</script>

<Seo title="Apply" description="Fill the application to join JPA Clans" />

<div in:fadeIn class="grid size-full grid-cols-1 gap-4 md:grid-cols-2">
    <div class="hidden h-full rounded-xl bg-cover bg-no-repeat md:flex" style="background-image: url('/apply_bg.webp')"></div>
    <div class="flex size-full flex-col justify-center gap-8 lg:p-8">
        <div class="flex flex-col gap-1">
            <h1 class="text-4xl font-bold">Clan Application</h1>
            <p class="text-sm text-stone-400">Submit your Clash of Clans account to join JPA clans</p>
        </div>

        <form onsubmit={handleSubmit} class="flex flex-col gap-6">
            <Field.Root required invalid={!!fieldErrors.cocAccountTag} class="flex flex-col gap-1">
                <Field.Label class="text-sm font-medium">Clan Tag</Field.Label>
                <Input
                    bind:value={cocAccountTag}
                    placeholder="#EXAMPLE123"
                    pattern="^#.*"
                    minlength={1}
                    maxlength={20}
                    disabled={isLoading}
                    aria-invalid={!!fieldErrors.cocAccountTag}
                />
                {#if fieldErrors.cocAccountTag}
                    <Field.ErrorText class="text-xs text-red-400">{fieldErrors.cocAccountTag}</Field.ErrorText>
                {:else}
                    <Field.HelperText class="text-xs text-stone-400">Include the # symbol at the beginning</Field.HelperText>
                {/if}
            </Field.Root>

            <Field.Root required invalid={!!fieldErrors.apiToken} class="flex flex-col gap-1">
                <Field.Label class="text-sm font-medium">API Token</Field.Label>
                <Input
                    bind:value={apiToken}
                    type="password"
                    placeholder="Enter your API token"
                    maxlength={500}
                    disabled={isLoading}
                    aria-invalid={!!fieldErrors.apiToken}
                />
                {#if fieldErrors.apiToken}
                    <Field.ErrorText class="text-xs text-red-400">{fieldErrors.apiToken}</Field.ErrorText>
                {:else}
                    <Field.HelperText class="text-xs text-stone-400">
                        Follow <a href="/guide/coc-api" target="_blank" class="text-stone-200 hover:text-stone-50">this guide</a> to create an API token.
                    </Field.HelperText>
                {/if}
            </Field.Root>

            <div class="flex justify-center">
                <Turnstile
                    on:callback={(e) => {
                        captchaToken = e.detail.token;
                    }}
                    siteKey={PUBLIC_TURNSTILE_SITE_KEY}
                    class="flex justify-center"
                    bind:reset
                />
            </div>

            <Button type="submit" disabled={isLoading || !cocAccountTag || !apiToken || !captchaToken}>
                {#if isLoading}
                    <span class="flex items-center justify-center gap-2">
                        <SvgSpinnersRingResize class="size-4" /> Submitting...
                    </span>
                {:else}
                    <span> Submit Application </span>
                {/if}
            </Button>
        </form>
    </div>
</div>
