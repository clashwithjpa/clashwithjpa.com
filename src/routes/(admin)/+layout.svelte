<script lang="ts">
    import { onNavigate } from "$app/navigation";
    import AdminBar from "$lib/components/admin/Bar.svelte";
    import type { Snippet } from "svelte";
    import type { PageData } from "./admin/$types";
    import "./app.css";

    interface Props {
        data: PageData;
        children?: Snippet;
    }

    let { data, children }: Props = $props();

    onNavigate((navigation) => {
        if (!document.startViewTransition) return;

        return new Promise((resolve) => {
            document.startViewTransition(async () => {
                resolve();
                await navigation.complete;
            });
        });
    });
</script>

<svelte:head>
    <title>JPA | Admin</title>
</svelte:head>

<AdminBar user={data.user}>
    {@render children?.()}
</AdminBar>
