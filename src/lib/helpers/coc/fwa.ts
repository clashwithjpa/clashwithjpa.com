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

export async function getFWAStats(clanTag: string) {
    clanTag = clanTag.replace("#", "");
    const resp = await fetch(`https://fwastats.com/Clan/${clanTag}/Members.json`);

    if (!resp.ok) {
        return { error: true };
    }

    const data = await resp.json();
    const members: { [key: string]: FWAStatsMember } = {};
    data.forEach((member: FWAStatsMember) => {
        members[member.tag] = member;
    });

    return members as FWAStats;
}
