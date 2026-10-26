import { authClient } from "#lib/auth.js";
import { toast } from "#lib/toast.js";
import { goto } from "$app/navigation";
import { fromStore } from "svelte/store";
import { island } from "../island.svelte";

export function watchImpersonation() {
    const session = fromStore(authClient.useSession());

    async function stop() {
        const { error } = await authClient.admin.stopImpersonating();
        if (error) {
            toast.error("Failed to stop impersonating", { description: error.message });
            return;
        }
        await session.current.refetch?.();
        toast.success("Stopped impersonating");
        await goto("/admin/users", { refreshAll: true });
    }

    $effect(() => {
        const data = session.current.data;
        if (!data?.session?.impersonatedBy) return;
        const id = island.show("impersonation", { name: data.user.name, onStop: stop }, { id: "impersonation" });
        return () => island.dismiss(id);
    });
}
