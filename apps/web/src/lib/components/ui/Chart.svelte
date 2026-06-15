<script lang="ts">
    import { AgCharts, AllCommunityModule, ModuleRegistry, type AgChartInstance, type AgChartOptions } from "ag-charts-community";
    import { onDestroy, onMount } from "svelte";

    ModuleRegistry.registerModules([AllCommunityModule]);

    interface Props {
        options: AgChartOptions;
        class?: string;
    }

    let { options, class: className = "" }: Props = $props();

    let chartContainer: HTMLDivElement;
    let chart: AgChartInstance | undefined = $state();

    const fontFamily = "Rubik, sans-serif";

    const theme: AgChartOptions["theme"] = {
        baseTheme: "ag-default-dark",
        palette: {
            fills: ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a78bfa", "#f97316"],
            strokes: ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a78bfa", "#f97316"],
        },
        overrides: {
            common: {
                background: { visible: false },
                title: { color: "#e7e5e4", fontSize: 14, fontWeight: "bold", fontFamily },
                subtitle: { color: "#a8a29e", fontSize: 12, fontFamily },
                padding: { top: 8, right: 8, bottom: 8, left: 8 },
                legend: { item: { label: { color: "#a8a29e", fontSize: 12, fontFamily }, marker: { size: 10 } } },
                axes: {
                    number: {
                        label: { color: "#a8a29e", fontFamily },
                        line: { stroke: "rgba(68,64,60,0.5)" },
                        tick: { stroke: "rgba(68,64,60,0.5)" },
                        gridLine: { style: [{ stroke: "rgba(68,64,60,0.35)" }] },
                    },
                    category: {
                        label: { color: "#a8a29e", fontFamily },
                        line: { stroke: "rgba(68,64,60,0.5)" },
                        tick: { stroke: "rgba(68,64,60,0.5)" },
                        gridLine: { style: [{ stroke: "rgba(68,64,60,0.35)" }] },
                    },
                    time: {
                        label: { color: "#a8a29e", fontFamily },
                        line: { stroke: "rgba(68,64,60,0.5)" },
                        tick: { stroke: "rgba(68,64,60,0.5)" },
                    },
                },
            },
        },
    };

    onMount(() => {
        chart = AgCharts.create({
            theme,
            ...options,
            container: chartContainer,
        });
    });

    onDestroy(() => {
        if (chart) {
            chart.destroy();
        }
    });

    $effect(() => {
        if (chart && options) {
            chart.update({
                theme,
                ...options,
                container: chartContainer,
            });
        }
    });
</script>

<div class="h-full w-full {className}" bind:this={chartContainer}></div>

<style>
    :global(.ag-charts-tooltip) {
        --ag-charts-tooltip-background-color: var(--color-stone-900);
        --ag-charts-tooltip-text-color: var(--color-stone-200);
        --ag-charts-tooltip-subtle-text-color: var(--color-stone-400);
        --ag-charts-tooltip-border-radius: var(--radius-lg, 8px);
        --ag-charts-tooltip-border-width: 2px;
        --ag-charts-border-color: color-mix(in srgb, var(--color-stone-700) 50%, transparent);
        --ag-charts-popup-shadow: none;
    }

    :global(.ag-charts-tooltip-title),
    :global(.ag-charts-tooltip-heading) {
        color: var(--color-stone-50);
    }
</style>
