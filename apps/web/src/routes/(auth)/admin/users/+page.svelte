<script lang="ts">
    import { authClient } from "$lib/auth";
    import { onMount } from "svelte";

    onMount(async () => {
        const session = await authClient.getSession();
        const logs = await authClient.dash.getAuditLogs({
            session: session.data,
            limit: 50,
            offset: 0,
        });
        // Access the data
        console.log(logs.data?.events); // Array of audit log events
        console.log(logs.data?.total); // Total count
        console.log(logs.data?.limit); // Page size
        console.log(logs.data?.offset); // Current offset
    });
</script>
