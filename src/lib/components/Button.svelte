<script lang="ts">
    import { Button } from "bits-ui";
    import { cn } from "$lib/components/utils/cn";

    interface Props {
        class?: string;
        type?: "success" | "danger" | "normal";
        size?: "sm" | "md" | "lg" | "xl" | "";
        href?: string;
        onclick?: () => void;
        children?: import("svelte").Snippet;
    }

    let { class: className = "", type = "normal", size = "", href = "", onclick = () => {}, children }: Props = $props();

    let sizeClass: string = $derived.by(() => {
        switch (size) {
            case "sm":
                return "text-sm px-2 py-1 lg:px-3 lg:py-2";
            case "md":
                return "text-base px-4 py-2 lg:px-5 lg:py-3";
            case "lg":
                return "text-lg px-4 py-3 lg:px-6 lg:py-4";
            case "xl":
                return "text-xl px-6 py-4 lg:px-8 lg:py-5";
            default:
                return "";
        }
    });

    let typeClass: string = $derived.by(() => {
        switch (type) {
            case "success":
                return "from-lime-200 via-lime-600 to-lime-600";
            case "danger":
                return "from-red-300 via-red-600 to-red-600";
            case "normal":
                return "from-yellow-400 via-orange-600 to-orange-600";
            default:
                return "";
        }
    });
</script>

<Button.Root
    class={cn(
        `z-10 flex rounded-xl bg-gradient-to-b ${typeClass} shadow-[0_0_0_3px_#F3F4F6,0_1px_0_6px_#030712,0_6px_0_6px_#0006] transition-all hover:brightness-110 active:translate-y-[2px] active:shadow-[0_0_0_3px_#F3F4F6,0_1px_0_6px_#030712,0_0_0_6px_#0006] active:brightness-90`,
        sizeClass,
        className
    )}
    {onclick}
    {href}
>
    <div
        class="flex items-center justify-center space-x-1 stroke-gray-950 stroke-[0.5px] shadow-gray-950 drop-shadow-[0_4px_0_var(--tw-shadow-color)]"
        style="-webkit-text-stroke: 1px var(--tw-shadow-color);"
    >
        {@render children?.()}
    </div>
</Button.Root>
