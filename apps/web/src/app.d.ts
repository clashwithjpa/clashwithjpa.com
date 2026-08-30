// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import "unplugin-icons/types/svelte";

declare global {
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }

    interface Window {
        // Injected by the Rybbit tracking script in app.html. Absent if the
        // script is blocked, so every call site guards with `?.`.
        rybbit?: {
            identify(userId: string, traits?: Record<string, unknown>): void;
            clearUserId(): void;
            getUserId(): string | null;
        };
    }
}

export {};
