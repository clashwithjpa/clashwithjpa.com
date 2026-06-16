const PREFIX = "jpa:";

interface Persisted<T> {
    get value(): T;
    set value(next: T);
}

function persisted<T>(key: string, fallback: T): Persisted<T> {
    const storageKey = PREFIX + key;

    function read(): T {
        if (typeof window === "undefined") return fallback;
        const raw = localStorage.getItem(storageKey);
        if (raw === null) return fallback;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return fallback;
        }
    }

    let value = $state<T>(read());

    return {
        get value() {
            return value;
        },
        set value(next: T) {
            value = next;
            if (typeof window !== "undefined") localStorage.setItem(storageKey, JSON.stringify(next));
        },
    };
}

const snowfall = persisted<boolean>("snowfall", false);
const sidebarSize = persisted<number>("sidebar-size", 88);

export const storage = {
    get snowfall(): boolean {
        return snowfall.value;
    },
    set snowfall(value: boolean) {
        snowfall.value = value;
    },

    get sidebarSize(): number {
        return sidebarSize.value;
    },
    set sidebarSize(value: number) {
        sidebarSize.value = value;
    },
};
