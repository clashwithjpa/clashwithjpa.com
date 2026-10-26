import { goto } from "$app/navigation";

/**
 * Tracks which section of a long page is on screen, for a sidebar table of contents.
 * Call it during component init. Clicking a link with `go` moves the highlight straight to
 * the target and holds it until the smooth scroll lands, instead of stepping through every
 * section the scroll passes on the way.
 */
export function createSectionSpy(getIds: () => string[]) {
    let activeId = $state("");
    let locked = false;
    let release: (() => void) | undefined;

    const setHash = (id: string) => goto(`#${id}`, { shallow: true, replace: true });

    function lockUntilScrollEnds() {
        release?.();
        locked = true;
        // scrollend never fires if the page is already at the target, hence the fallback.
        const timer = setTimeout(done, 1200);
        function done() {
            locked = false;
            clearTimeout(timer);
            document.removeEventListener("scrollend", done);
            release = undefined;
        }
        document.addEventListener("scrollend", done, { once: true });
        release = done;
    }

    function go(event: MouseEvent, id: string) {
        event.preventDefault();
        const target = document.getElementById(id);
        if (!target) return;
        activeId = id;
        setHash(id);
        lockUntilScrollEnds();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    $effect(() => {
        const ids = getIds();
        const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
        if (!els.length) return;

        const initial = decodeURIComponent(location.hash.slice(1));
        if (initial && ids.includes(initial)) {
            document.getElementById(initial)?.scrollIntoView({ block: "start" });
            activeId = initial;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (locked) return;
                const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) {
                    activeId = visible[0].target.id;
                    setHash(activeId);
                }
            },
            { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
        );
        els.forEach((el) => observer.observe(el));
        return () => {
            observer.disconnect();
            release?.();
        };
    });

    return {
        get activeId() {
            return activeId;
        },
        go,
    };
}
