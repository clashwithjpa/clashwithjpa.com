<script lang="ts">
    import AdminApplications from "$lib/components/admin/Applications.svelte";
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();

    const types: ("pending" | "rejected" | "accepted")[] = ["pending", "rejected", "accepted"];
</script>

<div class="*:not-first:mt-11">
    {#each types as type}
        <div class="flex w-full flex-col">
            <h1 class="text-2xl font-bold">{type.replace(/^\w/, (c) => c.toUpperCase())}</h1>
            <AdminApplications applications={data.applications} {type} />
        </div>
    {/each}
</div>
