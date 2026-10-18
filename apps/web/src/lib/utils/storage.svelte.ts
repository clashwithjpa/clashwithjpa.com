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
export type IslandSide = "left" | "right";
const islandSide = persisted<IslandSide>("island-side", "right");
const islandEggs = persisted<boolean>("island-eggs", true);
const musicShuffle = persisted<boolean>("music-shuffle", false);
const musicRepeatOne = persisted<boolean>("music-repeat-one", false);
const musicAutoplay = persisted<boolean>("music-autoplay", true);

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

    get islandSide(): IslandSide {
        return islandSide.value;
    },
    set islandSide(value: IslandSide) {
        islandSide.value = value;
    },

    get islandEggs(): boolean {
        return islandEggs.value;
    },
    set islandEggs(value: boolean) {
        islandEggs.value = value;
    },

    get musicShuffle(): boolean {
        return musicShuffle.value;
    },
    set musicShuffle(value: boolean) {
        musicShuffle.value = value;
    },

    get musicRepeatOne(): boolean {
        return musicRepeatOne.value;
    },
    set musicRepeatOne(value: boolean) {
        musicRepeatOne.value = value;
    },

    get musicAutoplay(): boolean {
        return musicAutoplay.value;
    },
    set musicAutoplay(value: boolean) {
        musicAutoplay.value = value;
    },
};
