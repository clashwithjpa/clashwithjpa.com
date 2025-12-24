interface FWAStatsMember {
    tag: string;
    name: string;
    role: string;
    level: number;
    donated: number;
    received: number;
    rank: number;
    trophies: number;
    league: string;
    townHall: number;
    weight: number;
    inWar: boolean;
}

interface FWAStats {
    [key: string]: FWAStatsMember;
}

export async function getFWAStats(fetch: any, clanTag: string) {
    clanTag = clanTag.replace("#", "");
    try {
        const resp = await fetch(`https://fwastats.com/Clan/${clanTag}/Members.json`, {
            timeout: 5000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 13; M2101K6P Build/TKQ1.221013.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/104.0.5112.97 Mobile Safari/537.36 GameBrowser/3.8.8"
            }
        });

        if (!resp.ok) {
            return { error: true };
        }

        const data = await resp.json();
        const members: { [key: string]: FWAStatsMember } = {};
        data.forEach((member: FWAStatsMember) => {
            members[member.tag] = member;
        });

        return members as FWAStats;
    } catch (e) {
        console.error("Error fetching FWA stats:", {
            message: e.message,
            code: e.code,
            cause: e.cause
        });
        return { error: true };
    }
}
