<script lang="ts">
    import { cn } from "$lib/utils";

    let {
        checked = $bindable(false),
        disabled = false,
        class: className = "",
        onCheckedChange,
    }: {
        checked?: boolean;
        disabled?: boolean;
        class?: string;
        onCheckedChange?: (checked: boolean) => void;
    } = $props();

    function toggle() {
        if (disabled) return;
        checked = !checked;
        onCheckedChange?.(checked);
    }
</script>

<!-- svelte-ignore a11y_consider_explicit_label -->
<button
    type="button"
    role="switch"
    aria-checked={checked}
    {disabled}
    onclick={toggle}
    class={cn(
        "press relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 shadow-xs outline-none disabled:cursor-not-allowed disabled:opacity-50!",
        checked ? "border-green-700/50 bg-green-900" : "border-red-700/50 bg-red-900",
        className,
    )}
>
    <span
        class={cn(
            "inline-block size-4 rounded-full transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5.5 bg-green-200" : "translate-x-0.5 bg-red-200",
        )}
    ></span>
</button>
