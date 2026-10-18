import { untrack } from "svelte";
import { ACTIVITIES, type ActivityDef, type ActivityKind, type ActivityProps } from "./activities";

export type Activity<K extends ActivityKind = ActivityKind> = {
    id: string;
    kind: K;
    props: ActivityProps<K>;
    priority: number;
    createdAt: number;
};

type ShowOptions = {
    id?: string;
    // Milliseconds before the activity removes itself. Omit to keep it until dismissed.
    duration?: number;
    priority?: number;
};

let nextId = 0;

class Island {
    #items = $state<Activity[]>([]);
    #timers = new Map<string, ReturnType<typeof setTimeout>>();
    expanded = $state(false);

    // Highest priority wins, and the newest breaks ties.
    current = $derived(
        this.#items.reduce<Activity | null>(
            (best, a) => (!best || a.priority > best.priority || (a.priority === best.priority && a.createdAt >= best.createdAt) ? a : best),
            null,
        ),
    );

    // Writes never track what they read, so a watcher can call show() or dismiss()
    // from an $effect without subscribing to the list it's changing.
    show<K extends ActivityKind>(kind: K, props: ActivityProps<K>, options: ShowOptions = {}): string {
        return untrack(() => this.#show(kind, props, options));
    }

    #show<K extends ActivityKind>(kind: K, props: ActivityProps<K>, options: ShowOptions): string {
        const id = options.id ?? `${kind}-${++nextId}`;
        const def: ActivityDef = ACTIVITIES[kind];
        const { priority = def.priority, duration = def.duration } = options;
        const replaced = def.single ? this.#items.filter((a) => a.kind === kind).map((a) => a.id) : [];
        for (const old of replaced) this.#clearTimer(old);

        const activity = { id, kind, props, priority, createdAt: performance.now() } as Activity;
        this.#items = [...this.#items.filter((a) => a.id !== id && !replaced.includes(a.id)), activity];

        this.#clearTimer(id);
        if (duration)
            this.#timers.set(
                id,
                setTimeout(() => this.dismiss(id), duration),
            );
        return id;
    }

    update<K extends ActivityKind>(id: string, props: Partial<ActivityProps<K>>) {
        untrack(() => {
            this.#items = this.#items.map((a) => (a.id === id ? ({ ...a, props: { ...a.props, ...props } } as Activity) : a));
        });
    }

    dismiss(id: string) {
        this.#clearTimer(id);
        untrack(() => {
            this.#items = this.#items.filter((a) => a.id !== id);
        });
    }

    has(id: string) {
        return this.#items.some((a) => a.id === id);
    }

    #clearTimer(id: string) {
        clearTimeout(this.#timers.get(id));
        this.#timers.delete(id);
    }
}

export const island = new Island();
