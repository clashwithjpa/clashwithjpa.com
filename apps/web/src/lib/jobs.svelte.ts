import { island } from "#lib/components/island/island.svelte.js";
import { onDestroy, untrack } from "svelte";
import { SvelteMap } from "svelte/reactivity";

type Listener = { key: () => string; apply: (result: unknown) => void };

const BUSY_ID = "jobs";

// Slow actions (syncs, live fetches, pings) belong to the app, not the page that
// started them. Leaving and coming back still shows them running and picks up
// their result, instead of offering the button again while the server works.
class Jobs {
    // Only the keys and labels of running jobs. Results go straight to listeners.
    #running = new SvelteMap<string, string>();
    #listeners = new Set<Listener>();
    #batch = { done: 0, total: 0 };

    running(key: string) {
        return this.#running.has(key);
    }

    // Does nothing if a job with this key is already running. The task handles its
    // own errors and toasts, and its result goes to every `onResult` for the key.
    start<T>(key: string, label: string, task: () => Promise<T>) {
        if (untrack(() => this.#running.has(key))) return;
        this.#set(key, label);
        task()
            .then(
                (result) => {
                    for (const l of this.#listeners) if (l.key() === key) l.apply(result);
                },
                (error) => console.error(error),
            )
            .finally(() => this.#set(key, null));
    }

    // Call while a component initialises. It receives results for as long as it is
    // mounted, including a job that started before it was.
    onResult<T>(key: string | (() => string), apply: (result: T) => void) {
        const listener: Listener = { key: typeof key === "string" ? () => key : key, apply: apply as Listener["apply"] };
        this.#listeners.add(listener);
        onDestroy(() => this.#listeners.delete(listener));
    }

    // One island pill covers every running job, so none hides behind another. With
    // several in one batch it fills a ring as they finish instead of spinning.
    #set(key: string, label: string | null) {
        untrack(() => {
            if (label) {
                this.#running.set(key, label);
                this.#batch.total++;
            } else {
                this.#running.delete(key);
                this.#batch.done++;
            }

            const labels = [...this.#running.values()];
            const { done, total } = this.#batch;
            if (labels.length === 0) {
                this.#batch = { done: 0, total: 0 };
                island.dismiss(BUSY_ID);
            } else if (total === 1) {
                island.show("busy", { label: labels[0]! }, { id: BUSY_ID });
            } else {
                island.show("busy", { label: `${done} of ${total} tasks done`, detail: labels.join(" · "), value: done / total }, { id: BUSY_ID });
            }
        });
    }
}

export const jobs = new Jobs();
