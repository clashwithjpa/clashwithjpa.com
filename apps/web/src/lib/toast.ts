import { island } from "$lib/components/island/island.svelte";

type Id = string | number;
type Tone = "success" | "info" | "neutral" | "warning" | "error";
type Options = { id?: Id; description?: string; duration?: number };

// Every toast shows in the island. Passing the id of a loading toast swaps the
// spinner for the result in place.
function show(tone: Tone, message: string, options: Options = {}): Id {
    const kind = tone === "error" || tone === "warning" ? "alert" : "toast";
    const id = options.id != null ? String(options.id) : undefined;
    // An error that settles a loading toast has a different kind, so it would
    // otherwise sit next to the spinner instead of replacing it.
    if (id) island.dismiss(id);
    return island.show(kind, { message, description: options.description, tone }, { id, duration: options.duration });
}

export const toast = Object.assign((message: string, options?: Options) => show("neutral", message, options), {
    success: (message: string, options?: Options) => show("success", message, options),
    info: (message: string, options?: Options) => show("info", message, options),
    warning: (message: string, options?: Options) => show("warning", message, options),
    error: (message: string, options?: Options) => show("error", message, options),
    loading: (message: string, options?: Options) =>
        island.show("busy", { label: message, detail: options?.description }, { id: options?.id != null ? String(options.id) : undefined }),
    dismiss: (id: Id) => island.dismiss(String(id)),
});
