export type ClanTagsType = {
    [key: string]: {
        [key: string]: string;
    };
};

export type ClanType = {
    tag: string;
    name: string;
    type: string;
    description: string;
    location: {
        id: number;
        name: string;
        isCountry: boolean;
        countryCode: string;
    };
    isFamilyFriendly: boolean;
    badgeUrls: {
        small: string;
        medium: string;
    };
    clanLevel: number;
    clanPoints: number;
    clanBuilderBasePoints: number;
    clanCapitalPoints: number;
    capitalLeague: {
        id: number;
        name: string;
    };
    requiredTrophies: number;
    warFrequency: string;
    warWinStreak: number;
    warWins: number;
    warTies: number;
    warLosses: number;
    isWarLogPublic: boolean;
    warLeague: {
        id: number;
        name: string;
    };
    members: number;
    memberList: ClanMemberType[];
    labels: {
        id: number;
        name: string;
        iconUrls: {
            small: string;
            medium: string;
        };
    }[];
    requiredBuilderBaseTrophies: number;
    requiredTownHallLevel: number;
    clanCapital: {
        capitalHallLevel: number;
        districts: {
            id: number;
            name: string;
            districtHallLevel: number;
        }[];
    };
    chatLanguage: {
        id: number;
        name: string;
        languageCode: string;
    };
};

export type ClanMemberType = {
    tag: string;
    name: string;
    role: string;
    townHallLevel: number;
    expLevel: number;
    league: {
        id: number;
        name: string;
        iconUrls: {
            small: string;
            tiny: string;
            medium: string;
        };
    };
    trophies: number;
    builderBaseTrophies: number;
    clanRank: number;
    previousClanRank: number;
    donations: number;
    donationsReceived: number;
    playerHouse: {
        elements: {
            type: string;
            id: number;
        }[];
    };
    builderBaseLeague: {
        id: number;
        name: string;
    };
};

export interface PlayerRoot {
    tag: string;
    name: string;
    townHallLevel: number;
    townHallWeaponLevel: number;
    expLevel: number;
    trophies: number;
    bestTrophies: number;
    warStars: number;
    attackWins: number;
    defenseWins: number;
    builderHallLevel: number;
    builderBaseTrophies: number;
    bestBuilderBaseTrophies: number;
    role: string;
    warPreference: string;
    donations: number;
    donationsReceived: number;
    clanCapitalContributions: number;
    clan: Clan;
    league: League;
    builderBaseLeague: BuilderBaseLeague;
    legendStatistics: LegendStatistics;
    achievements: Achievement[];
    playerHouse: PlayerHouse;
    labels: Label[];
    troops: Troop[];
    heroes: Her[];
    heroEquipment: HeroEquipment[];
    spells: Spell[];
}

export interface Clan {
    tag: string;
    name: string;
    clanLevel: number;
    badgeUrls: BadgeUrls;
}

export interface BadgeUrls {
    small: string;
    large: string;
    medium: string;
}

export interface League {
    id: number;
    name: string;
    iconUrls: IconUrls;
}

export interface IconUrls {
    small: string;
    tiny: string;
    medium: string;
}

export interface BuilderBaseLeague {
    id: number;
    name: string;
}

export interface LegendStatistics {
    legendTrophies: number;
    previousSeason: PreviousSeason;
    bestSeason: BestSeason;
    currentSeason: CurrentSeason;
}

export interface PreviousSeason {
    id: string;
    rank: number;
    trophies: number;
}

export interface BestSeason {
    id: string;
    rank: number;
    trophies: number;
}

export interface CurrentSeason {
    rank: number;
    trophies: number;
}

export interface Achievement {
    name: string;
    stars: number;
    value: number;
    target: number;
    info: string;
    completionInfo?: string;
    village: string;
}

export interface PlayerHouse {
    elements: Element[];
}

export interface Element {
    type: string;
    id: number;
}

export interface Label {
    id: number;
    name: string;
    iconUrls: IconUrls2;
}

export interface IconUrls2 {
    small: string;
    medium: string;
}

export interface Troop {
    name: string;
    level: number;
    maxLevel: number;
    village: string;
}

export interface Her {
    name: string;
    level: number;
    maxLevel: number;
    equipment?: Equipment[];
    village: string;
}

export interface Equipment {
    name: string;
    level: number;
    maxLevel: number;
    village: string;
}

export interface HeroEquipment {
    name: string;
    level: number;
    maxLevel: number;
    village: string;
}

export interface Spell {
    name: string;
    level: number;
    maxLevel: number;
    village: string;
}
