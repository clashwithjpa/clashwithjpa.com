// Clan Types

export type ClanTagsType = {
    [key: string]: {
        [key: string]: string;
    };
};

export interface ClanType {
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
        large: string;
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
    requiredTownhallLevel: number;
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
}

export interface ClanMemberType {
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
}

export interface ClanCurrentWarType {
    state: string;
    teamSize: number;
    attacksPerMember: number;
    battleModifier: string;
    preparationStartTime: string;
    startTime: string;
    endTime: string;
    clan: {
        tag: string;
        name: string;
        badgeUrls: {
            small: string;
            large: string;
            medium: string;
        };
        clanLevel: number;
        attacks: number;
        stars: number;
        destructionPercentage: number;
        members: {
            tag: string;
            name: string;
            townhallLevel: number;
            mapPosition: number;
            opponentAttacks: number;
        }[];
    };
    opponent: {
        tag: string;
        name: string;
        badgeUrls: {
            small: string;
            large: string;
            medium: string;
        };
        clanLevel: number;
        attacks: number;
        stars: number;
        destructionPercentage: number;
        members: {
            tag: string;
            name: string;
            townhallLevel: number;
            mapPosition: number;
            opponentAttacks: number;
        }[];
    };
}

export interface ClanMembersType {
    items: ClanMemberType[];
    paging: {
        cursors: {};
    };
}

export interface PlayerVerifyTokenType {
    tag: string;
    token: string;
    status: string;
}

export interface PlayerType {
    tag: string;
    name: string;
    townHallLevel: number;
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
    clan: {
        tag: string;
        name: string;
        clanLevel: number;
        badgeUrls: {
            small: string;
            large: string;
            medium: string;
        };
    };
    builderBaseLeague: {
        id: number;
        name: string;
    };
    achievements: {
        name: string;
        stars: number;
        value: number;
        target: number;
        info: string;
        completionInfo: string;
        village: string;
    }[];
    playerHouse: {
        elements: {
            type: string;
            id: number;
        }[];
    };
    labels: unknown[];
    troops: {
        name: string;
        level: number;
        maxLevel: number;
        village: string;
    }[];
    heroes: {
        name: string;
        level: number;
        maxLevel: number;
        equipment: {
            name: string;
            level: number;
            maxLevel: number;
            village: string;
        }[];
        village: string;
    }[];
    heroEquipment: {
        name: string;
        level: number;
        maxLevel: number;
        village: string;
    }[];
    spells: {
        name: string;
        level: number;
        maxLevel: number;
        village: string;
    }[];
}
