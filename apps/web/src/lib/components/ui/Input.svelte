<script lang="ts">
    import { cn, fromArkValue, type WithElementRef } from "$lib/utils";
    import { DateInput, useDateInput } from "@ark-ui/svelte/date-input";
    import { DatePicker, parseDate, useDatePicker } from "@ark-ui/svelte/date-picker";
    import { Portal } from "@ark-ui/svelte/portal";
    import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
    import TablerCalendar from "~icons/tabler/calendar";
    import TablerCheck from "~icons/tabler/check";
    import TablerChevronDown from "~icons/tabler/chevron-down";
    import TablerChevronLeft from "~icons/tabler/chevron-left";
    import TablerChevronRight from "~icons/tabler/chevron-right";
    import TablerChevronUp from "~icons/tabler/chevron-up";
    import TablerEye from "~icons/tabler/eye";
    import TablerEyeOff from "~icons/tabler/eye-off";

    type InputType = Exclude<HTMLInputTypeAttribute, "file">;

    type Props = WithElementRef<
        Omit<HTMLInputAttributes, "type" | "min" | "max"> & {
            type?: "file" | InputType;
            files?: FileList;
            min?: string | number | Date | null;
            max?: string | number | Date | null;
        }
    >;

    let {
        ref = $bindable(null),
        value = $bindable(),
        checked = $bindable(),
        type,
        files = $bindable(),
        class: className,
        min,
        max,
        ...restProps
    }: Props = $props();

    let isPasswordVisible = $state(false);
    let currentInputType = $derived(type === "password" ? (isPasswordVisible ? "text" : "password") : type);

    function stepUp() {
        if (ref && "stepUp" in ref) {
            (ref as HTMLInputElement).stepUp();
            value = Number((ref as HTMLInputElement).value);
        }
    }

    function stepDown() {
        if (ref && "stepDown" in ref) {
            (ref as HTMLInputElement).stepDown();
            value = Number((ref as HTMLInputElement).value);
        }
    }

    // Ark UI Date Picker Initialization
    const dateId = $derived(restProps.id || Math.random().toString(36).substring(7));
    const datePicker = $derived(
        useDatePicker({
            id: `${dateId}-picker`,
            min: min ? parseDate(min as string | Date) : undefined,
            max: max ? parseDate(max as string | Date) : undefined,
            onValueChange(details) {
                value = fromArkValue(details.value);
            },
        }),
    );
    const dateInput = $derived(
        useDateInput(() => ({
            id: dateId,
            value: datePicker().value,
            onValueChange(details) {
                datePicker().setValue(details.value);
                value = fromArkValue(details.value);
            },
        })),
    );
</script>

{#if type === "file"}
    <input
        bind:this={ref}
        data-slot="input"
        class={cn(
            "flex w-full min-w-0 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-sm text-stone-50 shadow-xs outline-none  selection:bg-stone-700 selection:text-stone-50 placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-50! md:text-sm",
            "transition-colors duration-200 ease-in-out focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50",
            "aria-invalid:border-red-700/50 aria-invalid:ring-red-700/50 dark:aria-invalid:ring-red-700/50",
            className,
        )}
        type="file"
        bind:files
        bind:value
        {...restProps}
    />
{:else if type === "password"}
    <div class="relative flex w-full items-center">
        <input
            bind:this={ref}
            data-slot="input"
            class={cn(
                "flex w-full min-w-0 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-base text-stone-50 shadow-xs outline-none  selection:bg-stone-700 selection:text-stone-50 placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-50! md:text-sm",
                "transition-colors duration-200 ease-in-out focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50",
                "aria-invalid:border-red-700/50 aria-invalid:ring-red-700/50 dark:aria-invalid:ring-red-700/50",
                "pr-10",
                className,
            )}
            type={currentInputType}
            bind:value
            {...restProps}
        />
        <button
            type="button"
            onclick={() => (isPasswordVisible = !isPasswordVisible)}
            class="absolute right-2 flex items-center justify-center rounded-lg p-1 text-stone-400 transition-colors duration-200 hover:bg-stone-700/50 hover:text-stone-50 disabled:cursor-not-allowed disabled:opacity-50!"
            disabled={restProps.disabled}
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            tabindex="-1"
        >
            {#if isPasswordVisible}
                <TablerEyeOff class="size-5" />
            {:else}
                <TablerEye class="size-5" />
            {/if}
        </button>
    </div>
{:else if type === "number"}
    <div class="relative flex w-full items-center">
        <input
            bind:this={ref}
            data-slot="input"
            class={cn(
                "flex w-full min-w-0 rounded-lg border-2 border-stone-700/50 bg-stone-900 py-2 pr-10 pl-4 text-base text-stone-50 shadow-xs outline-none  selection:bg-stone-700 selection:text-stone-50 placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-50! md:text-sm",
                "transition-colors duration-200 ease-in-out focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50",
                "aria-invalid:border-red-700/50 aria-invalid:ring-red-700/50 dark:aria-invalid:ring-red-700/50",
                "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                className,
            )}
            {type}
            bind:value
            {...restProps}
        />
        <div class="absolute right-0 flex h-full flex-col overflow-hidden rounded-r-md border-l-2 border-stone-700/50">
            <button
                type="button"
                tabindex="-1"
                disabled={restProps.disabled}
                onclick={stepUp}
                class="flex flex-1 items-center justify-center border-b-2 border-stone-700/50 px-2 text-stone-400 transition-colors hover:bg-stone-700/50 hover:text-stone-50 disabled:cursor-not-allowed disabled:opacity-50!"
                aria-label="Increase"
            >
                <TablerChevronUp class="size-3" />
            </button>
            <button
                type="button"
                tabindex="-1"
                disabled={restProps.disabled}
                onclick={stepDown}
                class="flex flex-1 items-center justify-center px-2 text-stone-400 transition-colors hover:bg-stone-700/50 hover:text-stone-50 disabled:cursor-not-allowed disabled:opacity-50!"
                aria-label="Decrease"
            >
                <TablerChevronDown class="size-3" />
            </button>
        </div>
    </div>
{:else if type === "checkbox"}
    <div class={cn("relative flex size-5 shrink-0 items-center justify-center", className)}>
        <input
            bind:this={ref}
            type="checkbox"
            bind:checked
            class="peer absolute z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            {...restProps}
        />
        <div
            class="pointer-events-none size-full rounded border-2 border-stone-700/50 bg-stone-900 transition-all duration-200 peer-checked:border-stone-200 peer-checked:bg-stone-200 peer-focus-visible:border-stone-700 peer-focus-visible:ring-4 peer-focus-visible:ring-stone-700/50 peer-disabled:opacity-50!"
        ></div>
        <TablerCheck
            stroke-width="3"
            class="pointer-events-none absolute size-3.5 scale-50 text-stone-900 opacity-0 transition-all duration-200 peer-checked:scale-100 peer-checked:opacity-100 peer-disabled:opacity-50!"
        />
    </div>
{:else if type === "date"}
    <DateInput.RootProvider value={dateInput} class="w-full">
        <DateInput.Control
            class={cn(
                "flex w-full min-w-0 items-center justify-between rounded-lg border-2 border-stone-700/50 bg-stone-900 px-2 py-1 text-base text-stone-50 shadow-xs transition-colors duration-200 ease-in-out outline-none focus-within:border-stone-700 focus-within:ring-4 focus-within:ring-stone-700/50 aria-invalid:border-red-700/50 aria-invalid:ring-red-700/50 md:text-sm dark:aria-invalid:ring-red-700/50",
                className,
            )}
        >
            <DatePicker.RootProvider value={datePicker} class="w-full ">
                <DatePicker.Control class="flex w-full items-center justify-between">
                    <DateInput.SegmentGroup class="flex items-center">
                        <DateInput.SegmentContext>
                            {#snippet render(segment)}
                                <DateInput.Segment
                                    class="rounded px-1 py-0.5 text-stone-200 transition-colors duration-200 outline-none placeholder:text-stone-400 focus:bg-stone-700/50 focus:text-stone-50 data-[state=invalid]:text-red-400"
                                    {segment}
                                />
                            {/snippet}
                        </DateInput.SegmentContext>
                    </DateInput.SegmentGroup>
                    <DatePicker.Trigger
                        class="flex items-center justify-center rounded-lg p-1 text-stone-400 transition-colors duration-200 hover:bg-stone-700/50 hover:text-stone-50 disabled:cursor-not-allowed disabled:opacity-50!"
                    >
                        <TablerCalendar class="size-5" />
                    </DatePicker.Trigger>
                </DatePicker.Control>
                <Portal>
                    <DatePicker.Positioner class="z-9999">
                        <DatePicker.Content
                            class="z-9999 flex w-[320px] flex-col gap-4 rounded-lg border-2 border-stone-700/50 bg-stone-900 p-4 text-stone-50 shadow-2xl backdrop-blur-sm outline-none data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                        >
                            <DatePicker.View view="day" class="flex flex-col gap-4">
                                <DatePicker.Context>
                                    {#snippet render(datePicker)}
                                        <DatePicker.ViewControl class="flex items-center justify-between gap-4 *:cursor-pointer">
                                            <DatePicker.PrevTrigger
                                                class="flex items-center justify-center rounded-lg bg-stone-900 p-2 text-stone-400 transition-colors duration-200 hover:bg-stone-700 hover:text-stone-50 data-disabled:pointer-events-none data-disabled:text-stone-400 data-disabled:opacity-50"
                                            >
                                                <TablerChevronLeft class="size-5" />
                                            </DatePicker.PrevTrigger>
                                            <DatePicker.ViewTrigger
                                                class="text-sm font-medium text-stone-200 transition-colors duration-200 hover:text-stone-50"
                                            >
                                                <DatePicker.RangeText />
                                            </DatePicker.ViewTrigger>
                                            <DatePicker.NextTrigger
                                                class="flex items-center justify-center rounded-lg bg-stone-900 p-2 text-stone-400 transition-colors duration-200 hover:bg-stone-700 hover:text-stone-50 data-disabled:pointer-events-none data-disabled:text-stone-400 data-disabled:opacity-50"
                                            >
                                                <TablerChevronRight class="size-5" />
                                            </DatePicker.NextTrigger>
                                        </DatePicker.ViewControl>
                                        <DatePicker.Table class="w-full border-collapse">
                                            <DatePicker.TableHead class="border-b-2 border-stone-700/50">
                                                <DatePicker.TableRow class="flex w-full justify-between pb-2">
                                                    {#each datePicker().weekDays as weekDay}
                                                        <DatePicker.TableHeader class="w-8 text-center text-xs font-medium text-stone-400">
                                                            {weekDay.short}
                                                        </DatePicker.TableHeader>
                                                    {/each}
                                                </DatePicker.TableRow>
                                            </DatePicker.TableHead>
                                            <DatePicker.TableBody class="flex flex-col gap-2 pt-2">
                                                {#each datePicker().weeks as week}
                                                    <DatePicker.TableRow class="flex w-full justify-between">
                                                        {#each week as day}
                                                            <DatePicker.TableCell class="p-0 text-center" value={day}>
                                                                <DatePicker.TableCellTrigger
                                                                    class="flex size-8 cursor-pointer items-center justify-center rounded-lg text-sm text-stone-200 transition-all duration-200 hover:bg-stone-700 hover:text-stone-50 data-disabled:pointer-events-none data-disabled:text-stone-400 data-disabled:opacity-50 data-outside-range:pointer-events-none data-outside-range:text-stone-400/50 data-selected:bg-stone-200 data-selected:font-semibold data-selected:text-stone-950 data-today:border-2 data-today:border-stone-700/50 data-unavailable:pointer-events-none data-unavailable:text-stone-400 data-unavailable:line-through data-unavailable:opacity-50"
                                                                >
                                                                    {day.day}
                                                                </DatePicker.TableCellTrigger>
                                                            </DatePicker.TableCell>
                                                        {/each}
                                                    </DatePicker.TableRow>
                                                {/each}
                                            </DatePicker.TableBody>
                                        </DatePicker.Table>
                                    {/snippet}
                                </DatePicker.Context>
                            </DatePicker.View>

                            <DatePicker.View view="month" class="flex flex-col gap-4">
                                <DatePicker.Context>
                                    {#snippet render(datePicker)}
                                        <DatePicker.ViewControl class="flex items-center justify-between gap-4 *:cursor-pointer">
                                            <DatePicker.PrevTrigger
                                                class="flex items-center justify-center rounded-lg bg-stone-900 p-2 text-stone-400 transition-colors duration-200 hover:bg-stone-700 hover:text-stone-50 data-disabled:pointer-events-none data-disabled:text-stone-400 data-disabled:opacity-50"
                                            >
                                                <TablerChevronLeft class="size-5" />
                                            </DatePicker.PrevTrigger>
                                            <DatePicker.ViewTrigger
                                                class="text-sm font-medium text-stone-200 transition-colors duration-200 hover:text-stone-50"
                                            >
                                                <DatePicker.RangeText />
                                            </DatePicker.ViewTrigger>
                                            <DatePicker.NextTrigger
                                                class="flex items-center justify-center rounded-lg bg-stone-900 p-2 text-stone-400 transition-colors duration-200 hover:bg-stone-700 hover:text-stone-50 data-disabled:pointer-events-none data-disabled:text-stone-400 data-disabled:opacity-50"
                                            >
                                                <TablerChevronRight class="size-5" />
                                            </DatePicker.NextTrigger>
                                        </DatePicker.ViewControl>
                                        <DatePicker.Table class="w-full border-collapse">
                                            <DatePicker.TableBody class="flex flex-col gap-4">
                                                {#each datePicker().getMonthsGrid({ columns: 4, format: "short" }) as months}
                                                    <DatePicker.TableRow class="flex w-full justify-between gap-2">
                                                        {#each months as month}
                                                            <DatePicker.TableCell class="flex-1 p-0 text-center" value={month.value}>
                                                                <DatePicker.TableCellTrigger
                                                                    class="flex w-full cursor-pointer items-center justify-center rounded-lg py-2 text-sm text-stone-200 transition-all duration-200 hover:bg-stone-700 hover:text-stone-50 data-disabled:pointer-events-none data-disabled:line-through data-disabled:opacity-50 data-selected:bg-stone-200 data-selected:font-semibold data-selected:text-stone-950"
                                                                >
                                                                    {month.label}
                                                                </DatePicker.TableCellTrigger>
                                                            </DatePicker.TableCell>
                                                        {/each}
                                                    </DatePicker.TableRow>
                                                {/each}
                                            </DatePicker.TableBody>
                                        </DatePicker.Table>
                                    {/snippet}
                                </DatePicker.Context>
                            </DatePicker.View>

                            <DatePicker.View view="year" class="flex flex-col gap-4">
                                <DatePicker.Context>
                                    {#snippet render(datePicker)}
                                        <DatePicker.ViewControl class="flex items-center justify-between gap-4 *:cursor-pointer">
                                            <DatePicker.PrevTrigger
                                                class="flex items-center justify-center rounded-lg bg-stone-900 p-2 text-stone-400 transition-colors duration-200 hover:bg-stone-700 hover:text-stone-50 data-disabled:pointer-events-none data-disabled:text-stone-400 data-disabled:opacity-50"
                                            >
                                                <TablerChevronLeft class="size-5" />
                                            </DatePicker.PrevTrigger>
                                            <DatePicker.ViewTrigger class="cursor-default! text-sm font-medium text-stone-200">
                                                <DatePicker.RangeText />
                                            </DatePicker.ViewTrigger>
                                            <DatePicker.NextTrigger
                                                class="flex items-center justify-center rounded-lg bg-stone-900 p-2 text-stone-400 transition-colors duration-200 hover:bg-stone-700 hover:text-stone-50 data-disabled:pointer-events-none data-disabled:text-stone-400 data-disabled:opacity-50"
                                            >
                                                <TablerChevronRight class="size-5" />
                                            </DatePicker.NextTrigger>
                                        </DatePicker.ViewControl>
                                        <DatePicker.Table class="w-full border-collapse">
                                            <DatePicker.TableBody class="flex flex-col gap-4">
                                                {#each datePicker().getYearsGrid({ columns: 4 }) as years}
                                                    <DatePicker.TableRow class="flex w-full justify-between gap-2">
                                                        {#each years as year}
                                                            <DatePicker.TableCell class="flex-1 p-0 text-center" value={year.value}>
                                                                <DatePicker.TableCellTrigger
                                                                    class="flex w-full cursor-pointer items-center justify-center rounded-lg py-2 text-sm text-stone-200 transition-all duration-200 hover:bg-stone-700 hover:text-stone-50 data-disabled:pointer-events-none data-disabled:line-through data-disabled:opacity-50 data-selected:bg-stone-200 data-selected:font-semibold data-selected:text-stone-950"
                                                                >
                                                                    {year.label}
                                                                </DatePicker.TableCellTrigger>
                                                            </DatePicker.TableCell>
                                                        {/each}
                                                    </DatePicker.TableRow>
                                                {/each}
                                            </DatePicker.TableBody>
                                        </DatePicker.Table>
                                    {/snippet}
                                </DatePicker.Context>
                            </DatePicker.View>
                        </DatePicker.Content>
                    </DatePicker.Positioner>
                </Portal>
            </DatePicker.RootProvider>
        </DateInput.Control>
        <DateInput.HiddenInput />
    </DateInput.RootProvider>
{:else}
    <input
        bind:this={ref}
        data-slot="input"
        class={cn(
            "flex w-full min-w-0 rounded-lg border-2 border-stone-700/50 bg-stone-900 px-4 py-2 text-base text-stone-50 shadow-xs outline-none  selection:bg-stone-700 selection:text-stone-50 placeholder:text-stone-400 disabled:cursor-not-allowed disabled:opacity-50! md:text-sm",
            "transition-colors duration-200 ease-in-out focus-visible:border-stone-700 focus-visible:ring-4 focus-visible:ring-stone-700/50",
            "aria-invalid:border-red-700/50 aria-invalid:ring-red-700/50 dark:aria-invalid:ring-red-700/50",
            className,
        )}
        {type}
        bind:value
        {...restProps}
    />
{/if}
