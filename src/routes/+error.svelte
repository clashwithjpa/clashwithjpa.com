<script lang="ts">
    import { page } from "$app/state";
    import CocButton from "$lib/components/app/CocButton.svelte";
    import H1 from "$lib/components/app/H1.svelte";
    import MaterialSymbolsChevronLeftRounded from "~icons/material-symbols/chevron-left-rounded";
</script>

<svelte:head>
    <title>JPA | {page.error?.message}</title>
</svelte:head>

<div class="font-coc h-screen w-screen">
    <img src="/error.webp" alt="Error" class="fixed inset-0 !size-full object-cover" />

    <div class="bg-background/50 fixed flex size-full items-center justify-center overflow-hidden">
        <div class="flex size-full flex-col items-center justify-center space-y-1 p-5">
            <H1 class="text-4xl font-bold md:text-6xl">{page.status}</H1>
            <h2 class="text-muted-foreground text-xl font-semibold lg:text-2xl">{page.error?.message}</h2>
            <div class="pt-5">
                <CocButton href="/" class="group">
                    <MaterialSymbolsChevronLeftRounded class="size-8 transition-transform group-hover:-translate-x-2" />
                    <span>Homepage</span>
                </CocButton>
            </div>
        </div>
    </div>
</div>
