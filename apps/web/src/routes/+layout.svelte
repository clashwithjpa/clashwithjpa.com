<script lang="ts">
    import ControlsPopup from "$lib/components/ControlsPopup.svelte";
    import "@cartamd/plugin-anchor/default.css";
    import "@cartamd/plugin-code/default.css";
    import "@cartamd/plugin-emoji/default.css";
    import "@cartamd/plugin-slash/default.css";
    import "carta-md/default.css";
    import "./layout.css";

    let { children } = $props();

    function handleMouseMove(e: MouseEvent) {
        let isOverScrollbar = window.innerWidth - e.clientX <= 24 || window.innerHeight - e.clientY <= 24;
        if (!isOverScrollbar) {
            let el = e.target as HTMLElement | null;
            while (el && el !== document.body) {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();

                const hasScrollbarY = el.scrollHeight > el.clientHeight && (style.overflowY === "auto" || style.overflowY === "scroll");
                const hasScrollbarX = el.scrollWidth > el.clientWidth && (style.overflowX === "auto" || style.overflowX === "scroll");

                if (hasScrollbarY && rect.right - e.clientX <= 24 && rect.right - e.clientX >= 0) {
                    isOverScrollbar = true;
                    break;
                }
                if (hasScrollbarX && rect.bottom - e.clientY <= 24 && rect.bottom - e.clientY >= 0) {
                    isOverScrollbar = true;
                    break;
                }

                el = el.parentElement;
            }
        }

        if (isOverScrollbar) {
            document.documentElement.classList.add("show-scrollbar");
        } else {
            document.documentElement.classList.remove("show-scrollbar");
        }
    }
</script>

<svelte:window onmousemove={handleMouseMove} />

<div class="h-screen w-screen overflow-x-hidden">
    {@render children()}
</div>

<ControlsPopup />
