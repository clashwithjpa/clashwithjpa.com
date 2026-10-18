// Wipes local state and cached assets, then reloads.
export async function clearSiteCache() {
    localStorage.clear();
    sessionStorage.clear();

    if ("caches" in window) {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
        } catch (err) {
            console.error("Error clearing caches", err);
        }
    }

    if ("serviceWorker" in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        } catch (err) {
            console.error("Error unregistering service workers", err);
        }
    }

    try {
        const cacheableAssets = new Set(["script", "link", "css", "font", "img"]);
        const assetUrls = new Set(
            (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
                .filter((entry) => cacheableAssets.has(entry.initiatorType) && entry.name.startsWith(window.location.origin))
                .map((entry) => entry.name),
        );
        await Promise.allSettled([...assetUrls].map((url) => fetch(url, { cache: "reload", credentials: "same-origin" })));
    } catch (err) {
        console.error("Error revalidating cached assets", err);
    }

    window.location.reload();
}
