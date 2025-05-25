<script lang="ts">
    import type { PageData } from "./$types";

    interface Props {
        data?: PageData;
    }

    let { data }: Props = $props();
</script>

<p>Welcome To Admin Panel</p>
