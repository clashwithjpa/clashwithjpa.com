<script module>
    import * as allThemes from "@uiw/codemirror-themes-all";

    // Filter out settings, init functions, styles, and color objects to get only the actual theme extensions
    export const themesMap = Object.entries(allThemes).reduce(
        (acc, [key, value]) => {
            if (
                key !== "default" &&
                typeof value === "object" &&
                value !== null &&
                !key.endsWith("Init") &&
                !key.endsWith("Settings") &&
                !key.endsWith("Style") &&
                !key.toLowerCase().includes("color") &&
                !key.startsWith("default")
            ) {
                acc[key] = value;
            }
            return acc;
        },
        {} as Record<string, any>,
    );

    export const themeOptions = Object.keys(themesMap).map((k) => ({
        label: k
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim(),
        value: k,
    }));
</script>

<script lang="ts">
    import { carta } from "$lib/carta";
    import Button from "$lib/components/ui/Button.svelte";
    import Select from "$lib/components/ui/Select.svelte";
    import { Splitter } from "@ark-ui/svelte/splitter";
    import { Tabs } from "@ark-ui/svelte/tabs";
    import { type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
    import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
    import { Compartment, EditorState } from "@codemirror/state";
    import { keymap, lineNumbers } from "@codemirror/view";
    import { bounds, BoundsFrom, draggable, events } from "@neodrag/svelte";
    import emojilib from "emojilib";

    const emojiCompletions = Object.entries(emojilib).flatMap(([emoji, aliases]) =>
        aliases.map((alias) => ({
            label: `:${alias}:`,
            detail: emoji,
            apply: emoji,
            type: "text",
            boost: alias === aliases[0] ? 2 : 1,
        })),
    );

    function emojiCompletionSource(context: CompletionContext): CompletionResult | null {
        const word = context.matchBefore(/:\w*/);
        if (!word) return null;
        if (word.from == word.to && !context.explicit) return null;

        return {
            from: word.from,
            options: emojiCompletions,
            validFor: /^:\w*$/,
        };
    }

    import { PreRendered } from "carta-md";
    import { basicSetup, EditorView } from "codemirror";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerDeviceFloppy from "~icons/tabler/device-floppy";

    let { value = $bindable(""), isMobile = false, onSave }: { value?: string; isMobile?: boolean; onSave?: () => Promise<void> | void } = $props();

    let editorRef: HTMLDivElement;
    let editor: EditorView;
    let previewHtml = $state("");

    const themeCompartment = new Compartment();

    let currentTheme = $state("vscodeDark");

    async function updatePreview(doc: string) {
        previewHtml = await carta.render(doc);
    }

    $effect(() => {
        updatePreview(value);
    });

    $effect(() => {
        if (editor) {
            editor.dispatch({
                effects: themeCompartment.reconfigure(themesMap[currentTheme] || themesMap["vscodeDark"]),
            });
        }
    });

    let typingTimeout: ReturnType<typeof setTimeout>;

    function createEditorState() {
        return EditorState.create({
            doc: value,
            extensions: [
                basicSetup,
                markdown(),
                markdownLanguage.data.of({ autocomplete: emojiCompletionSource }),
                lineNumbers(),
                keymap.of([
                    {
                        key: "Mod-s",
                        preventDefault: true,
                        run: () => {
                            handleSave();
                            return true;
                        },
                    },
                ]),
                themeCompartment.of(themesMap[currentTheme] || themesMap["vscodeDark"]),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        value = update.state.doc.toString();
                    }

                    if (update.docChanged || update.selectionSet) {
                        update.view.dom.classList.add("cursor-typing");
                        clearTimeout(typingTimeout);
                        typingTimeout = setTimeout(() => {
                            update.view.dom.classList.remove("cursor-typing");
                        }, 500);
                    }
                }),
            ],
        });
    }

    // Action to handle editor attachment when rendered inside a component that might mount it later
    function attachEditor(node: HTMLDivElement) {
        if (!editorRef) {
            editorRef = node;

            editor = new EditorView({
                state: createEditorState(),
                parent: editorRef,
            });
        }
        return {
            destroy() {
                editor?.destroy();
                editorRef = undefined as any;
            },
        };
    }

    let isSaving = $state(false);
    let selectOpen = $state(false);

    async function handleSave() {
        isSaving = true;
        try {
            if (onSave) {
                await onSave();
            }
        } finally {
            isSaving = false;
        }
    }
</script>

<div class="relative flex size-full flex-col overflow-hidden">
    {#if isMobile}
        <Tabs.Root defaultValue="editor" class="flex size-full flex-col">
            <Tabs.List class="flex w-full bg-stone-900">
                <Tabs.Trigger
                    value="editor"
                    class="flex-1 cursor-pointer py-2 text-stone-200 transition-colors duration-200 data-selected:bg-stone-800 data-selected:text-stone-50"
                    >Editor</Tabs.Trigger
                >
                <Tabs.Trigger
                    value="preview"
                    class="flex-1 cursor-pointer py-2 text-stone-200 transition-colors duration-200 data-selected:bg-stone-800 data-selected:text-stone-50"
                    >Preview</Tabs.Trigger
                >
            </Tabs.List>
            <Tabs.Content value="editor" class="w-full flex-1 overflow-hidden">
                <div use:attachEditor class="size-full"></div>
            </Tabs.Content>
            <Tabs.Content value="preview" class="flex-1 overflow-y-auto bg-stone-950 p-4">
                <div class="typography rules max-w-none!">
                    <PreRendered html={previewHtml} />
                </div>
            </Tabs.Content>
        </Tabs.Root>
    {:else}
        <Splitter.Root panels={[{ id: "editor" }, { id: "preview" }]} defaultSize={[50, 50]} class="flex size-full">
            <Splitter.Panel id="editor" class="flex size-full overflow-hidden bg-stone-950">
                <div use:attachEditor class="size-full"></div>
            </Splitter.Panel>

            <Splitter.ResizeTrigger
                id="editor:preview"
                class="group flex w-1.5 cursor-col-resize items-center justify-center bg-stone-900 transition-colors duration-200 hover:bg-stone-800"
            >
                <div class=" h-10 w-1 rounded-full bg-stone-800 transition-colors duration-200 group-hover:bg-stone-400"></div>
            </Splitter.ResizeTrigger>

            <Splitter.Panel id="preview" class="flex size-full overflow-hidden bg-stone-950">
                <div class="size-full overflow-y-auto p-4">
                    <div class="typography rules max-w-none!">
                        <PreRendered html={previewHtml} />
                    </div>
                </div>
            </Splitter.Panel>
        </Splitter.Root>
    {/if}

    <div class="pointer-events-none absolute inset-0 z-10 flex items-end justify-center overflow-hidden pb-6">
        <div
            {@attach draggable([bounds(BoundsFrom.parent()), events({ onDragStart: () => (selectOpen = false) })])}
            class="pointer-events-auto flex cursor-grab items-center gap-2 rounded-xl bg-stone-900 p-2 drop-shadow-2xl active:cursor-grabbing xl:gap-4"
        >
            <Select options={themeOptions} bind:value={currentTheme} bind:open={selectOpen} placeholder="Select theme" class="w-52" />
            <Button variant="success" onclick={handleSave} class="shrink-0" disabled={isSaving}>
                {#if isSaving}
                    <SvgSpinnersRingResize class="mr-2" />
                    Saving...
                {:else}
                    <TablerDeviceFloppy class="mr-2" />
                    Save Changes
                {/if}
            </Button>
        </div>
    </div>
</div>

<style>
    :global(.cm-content) {
        font-family: var(--font-mono);
    }

    :global(.cm-line) {
        padding: 0 1rem;
    }

    :global(.cm-editor) {
        height: 100%;
        width: 100%;
    }

    :global(.cm-scroller) {
        height: 100% !important;
        overflow: auto;
    }

    /* Pulse cursor blinking */
    :global(.cm-cursorLayer) {
        animation: cm-blink-pulse 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite !important;
    }

    :global(.cm-editor.cursor-typing .cm-cursorLayer) {
        animation: none !important;
    }

    @keyframes -global-cm-blink-pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0;
        }
    }

    /* Smooth cursor caret animation */
    :global(.cm-cursor) {
        transition:
            left 80ms ease-out,
            top 80ms ease-out !important;
        border-left-width: 2px !important;
    }
</style>
