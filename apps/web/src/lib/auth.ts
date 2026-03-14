import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/svelte";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_SERVER_URL,
    plugins: [adminClient()],
});
