import { PUBLIC_SERVER_URL } from "$env/static/public";
import { getGuildNicknames } from "@repo/clashofclans-client";

export async function loadGuildNicknames(): Promise<Record<string, string>> {
    try {
        const resp = await getGuildNicknames({ baseURL: PUBLIC_SERVER_URL, credentials: "include" });
        return resp.success ? resp.data.nicknames : {};
    } catch {
        return {};
    }
}
