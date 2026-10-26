import { getGuildNicknames } from "@repo/clashofclans-client";

export async function loadGuildNicknames(): Promise<Record<string, string>> {
    try {
        const resp = await getGuildNicknames({});
        return resp.data ? resp.data.data.nicknames : {};
    } catch {
        return {};
    }
}
