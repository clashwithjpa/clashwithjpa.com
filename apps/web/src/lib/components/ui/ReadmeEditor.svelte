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
    import { type CompletionContext, type CompletionResult, acceptCompletion } from "@codemirror/autocomplete";
    import { indentLess, indentMore } from "@codemirror/commands";
    import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
    import { indentUnit } from "@codemirror/language";
    import { Compartment, EditorState } from "@codemirror/state";
    import { highlightTrailingWhitespace, keymap, lineNumbers } from "@codemirror/view";
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

    import { beforeNavigate, goto } from "$app/navigation";
    import { PUBLIC_SERVER_URL } from "$env/static/public";
    import ConfirmationDialog from "$lib/components/ui/ConfirmationDialog.svelte";
    import { PreRendered } from "carta-md";
    import { basicSetup, EditorView } from "codemirror";
    import * as prettierPluginMarkdown from "prettier/plugins/markdown";
    import * as prettier from "prettier/standalone";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";
    import SvgSpinnersRingResize from "~icons/svg-spinners/ring-resize";
    import TablerDeviceFloppy from "~icons/tabler/device-floppy";
    import TablerUpload from "~icons/tabler/upload";
    import Toolbar from "../Toolbar.svelte";

    let { value = $bindable(""), isMobile = false, onSave }: { value?: string; isMobile?: boolean; onSave?: () => Promise<void> | void } = $props();

    let hasChanges = $state(false);
    let pendingNavigation = $state<string | null>(null);
    let allowNavigation = $state(false);
    let showConfirmDialog = $state(false);

    beforeNavigate((navigation) => {
        if (hasChanges && !allowNavigation) {
            navigation.cancel();
            pendingNavigation = navigation.to?.url.href || null;
            if (pendingNavigation) {
                showConfirmDialog = true;
            }
        }
    });

    onMount(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = "";
                return "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    });

    function proceedNavigation() {
        if (pendingNavigation) {
            allowNavigation = true;
            goto(pendingNavigation);
        }
    }

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
                indentUnit.of("    "),
                EditorState.tabSize.of(4),
                lineNumbers(),
                highlightTrailingWhitespace(),
                keymap.of([
                    {
                        key: "Tab",
                        run: (view) => {
                            if (acceptCompletion(view)) return true;
                            if (view.state.selection.ranges.some((r) => !r.empty)) {
                                return indentMore(view);
                            }
                            view.dispatch(view.state.replaceSelection("    "));
                            return true;
                        },
                        shift: indentLess,
                    },
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
                EditorView.domEventHandlers({
                    drop: (event, view) => {
                        const files = event.dataTransfer?.files;
                        if (files && files.length > 0) {
                            let handled = false;
                            for (let i = 0; i < files.length; i++) {
                                if (files[i].type.startsWith("image/")) {
                                    event.preventDefault();
                                    let posRaw = view.posAtCoords({ x: event.clientX, y: event.clientY });
                                    const posToUse = posRaw !== null ? (typeof posRaw === "number" ? posRaw : (posRaw as any).pos) : null;
                                    const pos = posToUse ?? view.state.selection.main.head;
                                    handleImageFile(files[i], view, pos);
                                    handled = true;
                                }
                            }
                            if (handled) return true;
                        }
                        return false;
                    },
                    paste: (event, view) => {
                        const items = event.clipboardData?.items;
                        if (items) {
                            let handled = false;
                            for (let i = 0; i < items.length; i++) {
                                if (items[i].type.startsWith("image/")) {
                                    const file = items[i].getAsFile();
                                    if (file) {
                                        event.preventDefault();
                                        const pos = view.state.selection.main.head;
                                        handleImageFile(file, view, pos);
                                        handled = true;
                                    }
                                }
                            }
                            if (handled) return true;
                        }
                        return false;
                    },
                }),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        value = update.state.doc.toString();
                        hasChanges = true;
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
    let fileInputRef: HTMLInputElement;

    function handleManualUploadClick() {
        fileInputRef?.click();
    }

    function handleFileInputChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0 && editor) {
            handleImageFile(target.files[0], editor);
            target.value = "";
        }
    }

    async function handleSave() {
        isSaving = true;
        try {
            if (editor) {
                const docText = editor.state.doc.toString();
                const currentCursor = editor.state.selection.main.head;
                try {
                    const result = await prettier.formatWithCursor(docText, {
                        parser: "markdown",
                        plugins: [prettierPluginMarkdown],
                        tabWidth: 4,
                        cursorOffset: currentCursor,
                    });

                    if (result.formatted !== docText) {
                        editor.dispatch({
                            changes: { from: 0, to: docText.length, insert: result.formatted },
                            selection: { anchor: result.cursorOffset },
                            scrollIntoView: true,
                        });
                    }
                } catch (err) {
                    toast.error("Failed to format markdown on save. Saving unformatted content.");
                    console.error("Format on save failed:", err);
                }
            }

            if (onSave) {
                await onSave();
            }
            hasChanges = false;
        } finally {
            isSaving = false;
        }
    }

    async function uploadImage(file: File): Promise<string> {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${PUBLIC_SERVER_URL}/upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error("Image upload failed:", error);
            throw error;
        }
    }

    function handleImageFile(file: File, view: EditorView, insertAt?: number) {
        if (!file.type.startsWith("image/")) return false;

        const pos = insertAt ?? view.state.selection.main.head;
        const uploadPlaceholder = `\n![Uploading ${file.name}...]()\n`;

        view.dispatch({
            changes: { from: pos, insert: uploadPlaceholder },
            selection: { anchor: pos + uploadPlaceholder.length },
        });

        uploadImage(file)
            .then((url) => {
                // Find where the placeholder is now, since the user might have typed more
                const docText = view.state.doc.toString();
                const placeholderIndex = docText.indexOf(uploadPlaceholder);

                if (placeholderIndex !== -1) {
                    // Replace the placeholder with the actual image markdown
                    const imageMarkdown = `\n![${file.name}](${url})\n`;
                    view.dispatch({
                        changes: {
                            from: placeholderIndex,
                            to: placeholderIndex + uploadPlaceholder.length,
                            insert: imageMarkdown,
                        },
                    });
                }
            })
            .catch(() => {
                const docText = view.state.doc.toString();
                const placeholderIndex = docText.indexOf(uploadPlaceholder);

                if (placeholderIndex !== -1) {
                    view.dispatch({
                        changes: {
                            from: placeholderIndex,
                            to: placeholderIndex + uploadPlaceholder.length,
                            insert: "",
                        },
                    });
                }
                toast.error(`Failed to upload ${file.name}`);
            });

        return true;
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

    <Toolbar onDragStart={() => (selectOpen = false)}>
        <input type="file" accept="image/*" class="hidden" bind:this={fileInputRef} onchange={handleFileInputChange} />
        <Select
            options={themeOptions}
            bind:value={currentTheme}
            bind:open={selectOpen}
            placeholder="Select theme"
            class="h-11 w-52 shrink-0 [&>div]:h-11"
        />
        <Button onclick={handleManualUploadClick} class="size-11 shrink-0 px-0" disabled={isSaving}>
            <TablerUpload class="size-5" />
        </Button>
        <Button variant={hasChanges ? "waiting" : "success"} onclick={handleSave} class="size-11 shrink-0 px-0" disabled={isSaving}>
            {#if isSaving}
                <SvgSpinnersRingResize class="size-5" />
            {:else}
                <TablerDeviceFloppy class="size-5" />
            {/if}
        </Button>
    </Toolbar>

    <ConfirmationDialog
        bind:open={showConfirmDialog}
        title="Unsaved Changes"
        description="You have unsaved changes. Do you want to leave without saving?"
        confirmText="Leave"
        cancelText="Cancel"
        onConfirm={proceedNavigation}
    >
        <span class="hidden"></span>
    </ConfirmationDialog>
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

    /* Override the default red background for trailing whitespace with VS Code-style dots */
    :global(.cm-trailingSpace) {
        background-color: transparent !important;
        background-image: radial-gradient(circle at center, #78716c 1.5px, transparent 1.5px) !important;
        background-size: 1ch 100% !important;
        background-repeat: repeat-x !important;
    }
</style>
