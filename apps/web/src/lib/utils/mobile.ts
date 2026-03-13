export function createMobileMediaQuery(callback: (isMobile: boolean) => void): () => void {
    if (typeof window === "undefined") return () => {};

    const mediaQuery = window.matchMedia("(max-width: 768px)");

    callback(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => callback(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
}
