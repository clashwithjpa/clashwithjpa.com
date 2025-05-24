<script lang="ts">
    import type { PageData } from "./$types";

    interface Props {
        data?: PageData;
    }

    let { data }: Props = $props();
</script>

<div class="size-full overflow-auto p-5">Hi</div>
