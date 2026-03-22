<script lang="ts">
    import { cn } from "$lib/utils";

    interface IconProps {
        name: string;
        class?: string;
    }
    let { name, class: className = "" }: IconProps = $props();
</script>

<div class={cn("size-full shrink-0 bg-cover bg-no-repeat", className)} style="background-image: url('/icons/{name}.webp');"></div>
