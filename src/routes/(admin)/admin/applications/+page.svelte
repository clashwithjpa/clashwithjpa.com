<script lang="ts">
    import AdminApplications from "$lib/components/admin/Applications.svelte";
    import { fade } from "svelte/transition";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    const types: ("pending" | "rejected" | "accepted")[] = ["pending", "rejected", "accepted"];
</script>

<div class="p-5 *:not-first:mt-11 md:p-11" in:fade>
    {#each types as type}
        <div class="flex w-full flex-col">
            <h1 class="text-3xl font-bold md:text-4xl">{type.replace(/^\w/, (c) => c.toUpperCase())}</h1>
            <AdminApplications applications={data.applications} {type} />
        </div>
    {/each}
</div>
