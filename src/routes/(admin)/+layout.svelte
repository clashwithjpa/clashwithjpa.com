<script lang="ts">
    import AdminBar from "$lib/components/admin/Bar.svelte";
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();
</script>

<svelte:head>
    <title>JPA | Admin</title>
</svelte:head>

<main class="flex size-full flex-col-reverse md:flex-row">
    <AdminBar />
    <main class="size-full overflow-auto pt-20 pb-20 md:pb-0 md:pl-52">
        {@render children?.()}
    </main>
</main>
