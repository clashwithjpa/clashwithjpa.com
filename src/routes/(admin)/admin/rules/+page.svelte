<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import { Button } from "$lib/components/ui/button";
    import { Tipex, type TipexEditor } from "@friendofsvelte/tipex";
    import "@friendofsvelte/tipex/styles/CodeBlock.css";
    import "@friendofsvelte/tipex/styles/Controls.css";
    import "@friendofsvelte/tipex/styles/EditLink.css";
    import "@friendofsvelte/tipex/styles/ProseMirror.css";
    import "@friendofsvelte/tipex/styles/Tipex.css";
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";
    import LucideSendHorizontal from "~icons/lucide/send-horizontal";
    import type { PageData } from "./$types";
    import "./tipex.css";

    let { data }: { data: PageData } = $props();
    let rules = $state(data.rules.content);

    $effect(() => {
        rules = data.rules.content;
    });

    let editor: TipexEditor | undefined = $state();
    let htmlContent = $derived(editor?.getHTML());
    let disabled: boolean = $state(false);

    async function save() {
        disabled = true;
        const body = {
            key: "rules",
            value: {
                content: htmlContent
            }
        };
        let response = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            toast.success("Rules saved successfully");
            invalidateAll();
            setTimeout(() => {
                disabled = false;
            }, 2000);
        } else {
            toast.error("Failed to save rules");
            setTimeout(() => {
                disabled = false;
            }, 2000);
        }
    }

    onMount(() => {
        onkeydown = (e) => {
            if (e.ctrlKey && e.key === "s") {
                e.preventDefault();
                if (disabled) return null;
                save();
            }
        };
    });
</script>

<div class="dark prose-a:text-indigo-400 prose-blockquote:not-italic prose-blockquote:text-green-400 marker:text-orange-400">
    <Tipex bind:tipex={editor} body={rules} controls floating focal={false}>
        {#snippet utilities()}
            <Button class="tipex-edit-button disabled:cursor-wait" onclick={save} {disabled}>
                <LucideSendHorizontal class="size-6" />
            </Button>
        {/snippet}
    </Tipex>
</div>
