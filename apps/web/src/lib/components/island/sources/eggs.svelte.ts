import { storage } from "$lib/utils/storage.svelte";
import { island } from "../island.svelte";

const EGGS = [
    { art: "/art/goblin-sign.webp", text: "psst… got any gold?", sub: "A goblin, probably" },
    { art: "/art/barbarian-king.webp", text: "Nah, I'd win", sub: "Barbarian King, before every war" },
    { art: "/art/grand-warden.webp", text: "Stand proud, you're strong", sub: "The Warden believes in you" },
    { art: "/art/archer-queen.webp", text: "Both attacks used?", sub: "The Queen is watching" },
    { art: "/art/gold-storage.webp", text: "Your storages look full", sub: "Just saying" },
    { art: "/art/goblin-facepalm.webp", text: "Someone forgot to attack again", sub: "We don't talk about it" },
];

// Kept rare on purpose: at most one per browser session, only some sessions get
// one at all, and only once the page has sat idle with nothing else showing.
const CHANCE = 0.35;
const IDLE_MS = 45_000;
const SEEN_KEY = "jpa:island-egg-seen";

function seen() {
    try {
        return sessionStorage.getItem(SEEN_KEY) !== null;
    } catch {
        return true;
    }
}

function markSeen() {
    try {
        sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
        // Without session storage the egg may show again next load, which is fine.
    }
}

export function watchEggs() {
    const lucky = Math.random() < CHANCE;

    $effect(() => {
        if (!lucky || !storage.islandEggs || seen()) return;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        let timer: ReturnType<typeof setTimeout>;
        const arm = () => {
            clearTimeout(timer);
            timer = setTimeout(fire, IDLE_MS);
        };
        const fire = () => {
            if (island.current || island.expanded || document.hidden) return arm();
            markSeen();
            stop();
            const egg = EGGS[Math.floor(Math.random() * EGGS.length)]!;
            island.show("egg", egg);
        };
        const events = ["pointermove", "keydown", "scroll", "touchstart"] as const;
        const stop = () => {
            clearTimeout(timer);
            for (const e of events) window.removeEventListener(e, arm, true);
        };

        for (const e of events) window.addEventListener(e, arm, { capture: true, passive: true });
        arm();
        return stop;
    });
}
