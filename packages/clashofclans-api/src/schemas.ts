/**
 * Zod schemas for CoC API responses.
 *
 * Each schema uses `satisfies z4.ZodType<T>` to enforce compile-time
 * 1:1 correspondence with the hand-written interfaces in types.ts.
 * If the interface changes (e.g. from a remote sync), TypeScript will
 * error here until the schema is updated to match.
 */
import z4 from "zod/v4";
import type {
    APIBadge,
    APIIcon,
    APILeagueTierIcon,
    APISeason,
    APIPaging,
    APICursors,
    APIChatLanguage,
    APIPlayerHouse,
    APIClanCapital,
    APIWarLeague,
    APICapitalLeague,
    APILabel,
    APILeagueTier,
    APILocation,
    APIClanMember,
    APIClan,
    APIClanList,
    APIClanMemberList,
    APIClanWarAttack,
    APIClanWarMember,
    APIWarClan,
    APIClanWar,
    APIWarLogClan,
    APIClanWarLog,
    APIClanWarLogList,
    APIClanWarLeagueClanMember,
    APIClanWarLeagueClan,
    APIClanWarLeagueRound,
    APIClanWarLeagueGroup,
    APICapitalRaidSeasonMember,
    APICapitalRaidSeasonClan,
    APICapitalRaidSeasonDistrict,
    APICapitalRaidSeasonAttackLog,
    APICapitalRaidSeasonDefenseLog,
    APICapitalRaidSeason,
    APICapitalRaidSeasons,
    APIPlayerClan,
    APILegendStatistics,
    APIPlayerAchievement,
    APIPlayerItem,
    APIPlayer,
    APIVerifyToken,
    APILootEntry,
    APIBattleLogEntry,
    APIBattleLogEntryList,
    APILeagueSeasonResult,
    APILeagueSeasonResultList,
    APILocationList,
    APIClanRanking,
    APIClanRankingList,
    APIPlayerRanking,
    APIPlayerRankingList,
    APIClanBuilderBaseRanking,
    APIClanBuilderBaseRankingList,
    APIPlayerBuilderBaseRanking,
    APIPlayerBuilderBaseRankingList,
    APIClanCapitalRanking,
    APIClanCapitalRankingList,
    APILeagueTierList,
    APIBuilderBaseLeague,
    APIBuilderBaseLeagueList,
    APIPlayerSeasonRankingList,
    APILeagueSeasonList,
    APIWarLeagueList,
    APICapitalLeagueList,
    APILabelList,
    APIGoldPassSeason,
} from "./types";

// **************** SHARED **************** //

export const APICursorsSchema = z4.object({
    after: z4.string().optional(),
    before: z4.string().optional(),
}) satisfies z4.ZodType<APICursors>;

export const APIPagingSchema = z4.object({
    cursors: APICursorsSchema.optional(),
}) satisfies z4.ZodType<APIPaging>;

export const APIIconSchema = z4.object({
    small: z4.string(),
    tiny: z4.string().optional(),
    medium: z4.string().optional(),
}) satisfies z4.ZodType<APIIcon>;

export const APILeagueTierIconSchema = z4.object({
    small: z4.string(),
    large: z4.string(),
}) satisfies z4.ZodType<APILeagueTierIcon>;

export const APIBadgeSchema = z4.object({
    small: z4.string(),
    large: z4.string(),
    medium: z4.string(),
}) satisfies z4.ZodType<APIBadge>;

export const APISeasonSchema = z4.object({
    id: z4.string(),
    rank: z4.number(),
    trophies: z4.number(),
}) satisfies z4.ZodType<APISeason>;

// **************** CLANS **************** //

export const APIChatLanguageSchema = z4.object({
    name: z4.string(),
    id: z4.number(),
    languageCode: z4.string(),
}) satisfies z4.ZodType<APIChatLanguage>;

export const APIPlayerHouseSchema = z4.object({
    elements: z4.array(
        z4.object({
            type: z4.string(),
            id: z4.number(),
        }),
    ),
}) satisfies z4.ZodType<APIPlayerHouse>;

export const APIClanCapitalSchema = z4.object({
    capitalHallLevel: z4.number().optional(),
    districts: z4
        .array(
            z4.object({
                id: z4.number(),
                name: z4.string(),
                districtHallLevel: z4.number(),
            }),
        )
        .optional(),
}) satisfies z4.ZodType<APIClanCapital>;

export const APIWarLeagueSchema = z4.object({
    id: z4.number(),
    name: z4.string(),
}) satisfies z4.ZodType<APIWarLeague>;

export const APICapitalLeagueSchema = z4.object({
    id: z4.number(),
    name: z4.string(),
}) satisfies z4.ZodType<APICapitalLeague>;

export const APILabelSchema = z4.object({
    id: z4.number(),
    name: z4.string(),
    iconUrls: APIIconSchema,
}) satisfies z4.ZodType<APILabel>;

export const APILeagueTierSchema = z4.object({
    id: z4.number(),
    name: z4.string(),
    iconUrls: APILeagueTierIconSchema,
}) satisfies z4.ZodType<APILeagueTier>;

export const APILocationSchema = z4.object({
    localizedName: z4.string().optional(),
    id: z4.number(),
    name: z4.string(),
    isCountry: z4.boolean(),
    countryCode: z4.string().optional(),
}) satisfies z4.ZodType<APILocation>;

export const APIClanMemberSchema = z4.object({
    name: z4.string(),
    tag: z4.string(),
    role: z4.enum(["member", "admin", "coLeader", "leader"]),
    expLevel: z4.number(),
    townHallLevel: z4.number(),
    leagueTier: APILeagueTierSchema.optional(),
    builderBaseLeague: z4
        .object({
            id: z4.number(),
            name: z4.string(),
        })
        .optional(),
    trophies: z4.number(),
    builderBaseTrophies: z4.number().optional(),
    clanRank: z4.number(),
    previousClanRank: z4.number(),
    donations: z4.number(),
    donationsReceived: z4.number(),
    playerHouse: APIPlayerHouseSchema.optional(),
}) satisfies z4.ZodType<APIClanMember>;

export const APIClanSchema = z4.object({
    tag: z4.string(),
    name: z4.string(),
    type: z4.enum(["open", "inviteOnly", "closed"]),
    description: z4.string(),
    location: APILocationSchema.optional(),
    chatLanguage: APIChatLanguageSchema.optional(),
    badgeUrls: APIBadgeSchema,
    clanLevel: z4.number(),
    clanPoints: z4.number(),
    clanBuilderBasePoints: z4.number(),
    requiredTrophies: z4.number(),
    requiredTownhallLevel: z4.number().optional(),
    requiredBuilderBaseTrophies: z4.number().optional(),
    warFrequency: z4.enum(["always", "moreThanOncePerWeek", "oncePerWeek", "lessThanOncePerWeek", "never", "unknown"]).optional(),
    warWinStreak: z4.number(),
    warWins: z4.number(),
    warTies: z4.number().optional(),
    warLosses: z4.number().optional(),
    isWarLogPublic: z4.boolean(),
    warLeague: APIWarLeagueSchema.optional(),
    members: z4.number(),
    labels: z4.array(APILabelSchema),
    memberList: z4.array(APIClanMemberSchema),
    clanCapital: APIClanCapitalSchema,
    isFamilyFriendly: z4.boolean(),
    clanCapitalPoints: z4.number(),
    capitalLeague: APICapitalLeagueSchema.optional(),
}) satisfies z4.ZodType<APIClan>;

export const APIClanListSchema = z4.object({
    items: z4.array(APIClanSchema.omit({ memberList: true, clanCapital: true })),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIClanList>;

export const APIClanMemberListSchema = z4.object({
    items: z4.array(APIClanMemberSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIClanMemberList>;

export const APIClanWarAttackSchema = z4.object({
    order: z4.number(),
    attackerTag: z4.string(),
    defenderTag: z4.string(),
    stars: z4.number(),
    duration: z4.number(),
    destructionPercentage: z4.number(),
}) satisfies z4.ZodType<APIClanWarAttack>;

export const APIClanWarMemberSchema = z4.object({
    tag: z4.string(),
    name: z4.string(),
    mapPosition: z4.number(),
    townhallLevel: z4.number(),
    opponentAttacks: z4.number(),
    bestOpponentAttack: APIClanWarAttackSchema.optional(),
    attacks: z4.array(APIClanWarAttackSchema).optional(),
}) satisfies z4.ZodType<APIClanWarMember>;

export const APIWarClanSchema = z4.object({
    tag: z4.string(),
    name: z4.string(),
    badgeUrls: APIBadgeSchema,
    clanLevel: z4.number(),
    attacks: z4.number(),
    stars: z4.number(),
    destructionPercentage: z4.number(),
    members: z4.array(APIClanWarMemberSchema),
}) satisfies z4.ZodType<APIWarClan>;

export const APIClanWarSchema = z4.object({
    state: z4.enum(["notInWar", "preparation", "inWar", "warEnded"]),
    teamSize: z4.number(),
    startTime: z4.string(),
    preparationStartTime: z4.string(),
    battleModifier: z4.enum(["none", "hardMode"]).optional(),
    endTime: z4.string(),
    clan: APIWarClanSchema,
    opponent: APIWarClanSchema,
    attacksPerMember: z4.number().optional(),
}) satisfies z4.ZodType<APIClanWar>;

export const APIWarLogClanSchema = z4.object({
    tag: z4.string().optional(),
    name: z4.string().optional(),
    badgeUrls: APIBadgeSchema,
    clanLevel: z4.number(),
    attacks: z4.number().optional(),
    stars: z4.number(),
    destructionPercentage: z4.number(),
    expEarned: z4.number().optional(),
}) satisfies z4.ZodType<APIWarLogClan>;

export const APIClanWarLogSchema = z4.object({
    result: z4.enum(["win", "lose", "tie"]).nullable().optional(),
    endTime: z4.string(),
    battleModifier: z4.enum(["none", "hardMode"]).optional(),
    teamSize: z4.number(),
    attacksPerMember: z4.number().optional(),
    clan: APIWarLogClanSchema,
    opponent: APIWarLogClanSchema,
}) satisfies z4.ZodType<APIClanWarLog>;

export const APIClanWarLogListSchema = z4.object({
    items: z4.array(APIClanWarLogSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIClanWarLogList>;

export const APIClanWarLeagueClanMemberSchema = z4.object({
    name: z4.string(),
    tag: z4.string(),
    townHallLevel: z4.number(),
}) satisfies z4.ZodType<APIClanWarLeagueClanMember>;

export const APIClanWarLeagueClanSchema = z4.object({
    name: z4.string(),
    tag: z4.string(),
    clanLevel: z4.number(),
    badgeUrls: APIBadgeSchema,
    members: z4.array(APIClanWarLeagueClanMemberSchema),
}) satisfies z4.ZodType<APIClanWarLeagueClan>;

export const APIClanWarLeagueRoundSchema = z4.object({
    warTags: z4.array(z4.string()),
}) satisfies z4.ZodType<APIClanWarLeagueRound>;

export const APIClanWarLeagueGroupSchema = z4.object({
    state: z4.enum(["notInWar", "preparation", "inWar", "ended"]),
    season: z4.string(),
    clans: z4.array(APIClanWarLeagueClanSchema),
    rounds: z4.array(APIClanWarLeagueRoundSchema),
}) satisfies z4.ZodType<APIClanWarLeagueGroup>;

export const APICapitalRaidSeasonMemberSchema = z4.object({
    tag: z4.string(),
    name: z4.string(),
    attacks: z4.number(),
    attackLimit: z4.number(),
    bonusAttackLimit: z4.number(),
    capitalResourcesLooted: z4.number(),
}) satisfies z4.ZodType<APICapitalRaidSeasonMember>;

export const APICapitalRaidSeasonClanSchema = z4.object({
    tag: z4.string(),
    name: z4.string(),
    level: z4.number(),
    badgeUrls: APIBadgeSchema,
}) satisfies z4.ZodType<APICapitalRaidSeasonClan>;

export const APICapitalRaidSeasonDistrictSchema = z4.object({
    id: z4.number(),
    name: z4.string(),
    districtHallLevel: z4.number(),
    destructionPercent: z4.number(),
    attackCount: z4.number(),
    totalLooted: z4.number(),
}) satisfies z4.ZodType<APICapitalRaidSeasonDistrict>;

export const APICapitalRaidSeasonAttackLogSchema = z4.object({
    defender: APICapitalRaidSeasonClanSchema,
    attackCount: z4.number(),
    districtCount: z4.number(),
    districtsDestroyed: z4.number(),
    districts: z4.array(APICapitalRaidSeasonDistrictSchema),
}) satisfies z4.ZodType<APICapitalRaidSeasonAttackLog>;

export const APICapitalRaidSeasonDefenseLogSchema = z4.object({
    attacker: APICapitalRaidSeasonClanSchema,
    attackCount: z4.number(),
    districtCount: z4.number(),
    districtsDestroyed: z4.number(),
    districts: z4.array(APICapitalRaidSeasonDistrictSchema),
}) satisfies z4.ZodType<APICapitalRaidSeasonDefenseLog>;

export const APICapitalRaidSeasonSchema = z4.object({
    state: z4.enum(["ongoing", "ended"]),
    startTime: z4.string(),
    endTime: z4.string(),
    capitalTotalLoot: z4.number(),
    raidsCompleted: z4.number(),
    totalAttacks: z4.number(),
    enemyDistrictsDestroyed: z4.number(),
    offensiveReward: z4.number(),
    defensiveReward: z4.number(),
    members: z4.array(APICapitalRaidSeasonMemberSchema).optional(),
    attackLog: z4.array(APICapitalRaidSeasonAttackLogSchema),
    defenseLog: z4.array(APICapitalRaidSeasonDefenseLogSchema),
}) satisfies z4.ZodType<APICapitalRaidSeason>;

export const APICapitalRaidSeasonsSchema = z4.object({
    items: z4.array(APICapitalRaidSeasonSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APICapitalRaidSeasons>;

// *************** PLAYERS *************** //

export const APIPlayerClanSchema = z4.object({
    tag: z4.string(),
    name: z4.string(),
    clanLevel: z4.number(),
    badgeUrls: APIBadgeSchema,
}) satisfies z4.ZodType<APIPlayerClan>;

export const APILegendStatisticsSchema = z4.object({
    previousSeason: APISeasonSchema.optional(),
    previousBuilderBaseSeason: APISeasonSchema.optional(),
    bestBuilderBaseSeason: APISeasonSchema.optional(),
    currentSeason: APISeasonSchema.optional(),
    bestSeason: APISeasonSchema.optional(),
    legendTrophies: z4.number(),
}) satisfies z4.ZodType<APILegendStatistics>;

export const APIPlayerAchievementSchema: z4.ZodType<APIPlayerAchievement> = z4.object({
    name: z4.string(),
    stars: z4.number(),
    value: z4.number(),
    target: z4.number(),
    info: z4.string(),
    completionInfo: z4.nullable(z4.string()),
    village: z4.enum(["home", "builderBase"]),
}) as unknown as z4.ZodType<APIPlayerAchievement>;

export const APIPlayerItemSchema: z4.ZodType<APIPlayerItem> = z4.object({
    name: z4.string(),
    level: z4.number(),
    maxLevel: z4.number(),
    superTroopIsActive: z4.boolean().optional(),
    equipment: z4.lazy(() => z4.array(APIPlayerItemSchema)).optional(),
    village: z4.enum(["home", "builderBase"]),
});

export const APIPlayerSchema = z4.object({
    name: z4.string(),
    tag: z4.string(),
    townHallLevel: z4.number(),
    townHallWeaponLevel: z4.number().optional(),
    expLevel: z4.number(),
    trophies: z4.number(),
    bestTrophies: z4.number(),
    warStars: z4.number(),
    attackWins: z4.number(),
    defenseWins: z4.number(),
    builderHallLevel: z4.number().optional(),
    builderBaseTrophies: z4.number().optional(),
    bestBuilderBaseTrophies: z4.number().optional(),
    donations: z4.number(),
    donationsReceived: z4.number(),
    clanCapitalContributions: z4.number(),
    role: z4.string().optional(),
    warPreference: z4.enum(["in", "out"]).optional(),
    clan: APIPlayerClanSchema.optional(),
    leagueTier: APILeagueTierSchema.optional(),
    builderBaseLeague: z4
        .object({
            id: z4.number(),
            name: z4.string(),
        })
        .optional(),
    legendStatistics: APILegendStatisticsSchema.optional(),
    achievements: z4.array(APIPlayerAchievementSchema),
    troops: z4.array(APIPlayerItemSchema),
    heroes: z4.array(APIPlayerItemSchema),
    spells: z4.array(APIPlayerItemSchema),
    heroEquipment: z4.array(APIPlayerItemSchema),
    labels: z4.array(APILabelSchema),
    playerHouse: APIPlayerHouseSchema.optional(),
}) satisfies z4.ZodType<APIPlayer>;

export const APIVerifyTokenSchema = z4.object({
    tag: z4.string(),
    token: z4.string(),
    status: z4.enum(["ok", "invalid"]),
}) satisfies z4.ZodType<APIVerifyToken>;

export const APILootEntrySchema = z4.object({
    name: z4.string(),
    amount: z4.number(),
}) satisfies z4.ZodType<APILootEntry>;

export const APIBattleLogEntrySchema = z4.object({
    battleType: z4.enum(["legend", "homeVillage", "ranked"]),
    attack: z4.boolean(),
    armyShareCode: z4.string(),
    opponentPlayerTag: z4.string(),
    stars: z4.number(),
    destructionPercentage: z4.number(),
    lootedResources: z4.array(APILootEntrySchema),
    extraLootedResources: z4.array(APILootEntrySchema),
    availableLoot: z4.array(APILootEntrySchema),
}) satisfies z4.ZodType<APIBattleLogEntry>;

export const APIBattleLogEntryListSchema = z4.object({
    items: z4.array(APIBattleLogEntrySchema),
}) satisfies z4.ZodType<APIBattleLogEntryList>;

export const APILeagueSeasonResultSchema = z4.object({
    leagueSeasonId: z4.number(),
    leagueTrophies: z4.number(),
    leagueTierId: z4.number(),
    placement: z4.number(),
    attackWins: z4.number(),
    attackLosses: z4.number(),
    attackStars: z4.number(),
    defenseWins: z4.number(),
    defenseLosses: z4.number(),
    defenseStars: z4.number(),
    maxBattles: z4.number(),
}) satisfies z4.ZodType<APILeagueSeasonResult>;

export const APILeagueSeasonResultListSchema = z4.object({
    items: z4.array(APILeagueSeasonResultSchema),
}) satisfies z4.ZodType<APILeagueSeasonResultList>;

// ************* LOCATIONS ************* //

export const APILocationListSchema = z4.object({
    items: z4.array(APILocationSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APILocationList>;

export const APIClanRankingSchema = z4.object({
    clanLevel: z4.number(),
    clanPoints: z4.number(),
    location: APILocationSchema,
    members: z4.number(),
    tag: z4.string(),
    name: z4.string(),
    rank: z4.number(),
    previousRank: z4.number(),
    badgeUrls: APIBadgeSchema,
}) satisfies z4.ZodType<APIClanRanking>;

export const APIClanRankingListSchema = z4.object({
    items: z4.array(APIClanRankingSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIClanRankingList>;

export const APIPlayerRankingSchema = z4.object({
    tag: z4.string(),
    name: z4.string(),
    expLevel: z4.number(),
    trophies: z4.number(),
    attackWins: z4.number(),
    defenseWins: z4.number(),
    rank: z4.number(),
    previousRank: z4.number(),
    clan: APIPlayerClanSchema.omit({ clanLevel: true }).optional(),
    leagueTier: APILeagueTierSchema.optional(),
}) satisfies z4.ZodType<APIPlayerRanking>;

export const APIPlayerRankingListSchema = z4.object({
    items: z4.array(APIPlayerRankingSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIPlayerRankingList>;

export const APIClanBuilderBaseRankingSchema = z4.object({
    clanLevel: z4.number(),
    location: APILocationSchema,
    members: z4.number(),
    tag: z4.string(),
    name: z4.string(),
    rank: z4.number(),
    previousRank: z4.number(),
    badgeUrls: APIBadgeSchema,
    clanBuilderBasePoints: z4.number(),
}) satisfies z4.ZodType<APIClanBuilderBaseRanking>;

export const APIClanBuilderBaseRankingListSchema = z4.object({
    items: z4.array(APIClanBuilderBaseRankingSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIClanBuilderBaseRankingList>;

export const APIPlayerBuilderBaseRankingSchema = z4.object({
    tag: z4.string(),
    name: z4.string(),
    expLevel: z4.number(),
    builderBaseTrophies: z4.number(),
    rank: z4.number(),
    previousRank: z4.number(),
    clan: APIPlayerClanSchema.optional(),
    builderBaseLeague: z4
        .object({
            id: z4.number(),
            name: z4.string(),
        })
        .optional(),
}) satisfies z4.ZodType<APIPlayerBuilderBaseRanking>;

export const APIPlayerBuilderBaseRankingListSchema = z4.object({
    items: z4.array(APIPlayerBuilderBaseRankingSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIPlayerBuilderBaseRankingList>;

export const APIClanCapitalRankingSchema = z4.object({
    clanLevel: z4.number(),
    clanPoints: z4.number(),
    location: APILocationSchema,
    members: z4.number(),
    tag: z4.string(),
    name: z4.string(),
    rank: z4.number(),
    previousRank: z4.number(),
    badgeUrls: APIBadgeSchema,
    clanCapitalPoints: z4.number(),
}) satisfies z4.ZodType<APIClanCapitalRanking>;

export const APIClanCapitalRankingListSchema = z4.object({
    items: z4.array(APIClanCapitalRankingSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIClanCapitalRankingList>;

// *************** LEAGUES *************** //

export const APILeagueTierListSchema = z4.object({
    items: z4.array(APILeagueTierSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APILeagueTierList>;

export const APIBuilderBaseLeagueSchema = z4.object({
    id: z4.number(),
    name: z4.string(),
}) satisfies z4.ZodType<APIBuilderBaseLeague>;

export const APIBuilderBaseLeagueListSchema = z4.object({
    items: z4.array(APIBuilderBaseLeagueSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIBuilderBaseLeagueList>;

export const APIPlayerSeasonRankingListSchema = z4.object({
    items: z4.array(APIPlayerRankingSchema.omit({ leagueTier: true })),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIPlayerSeasonRankingList>;

export const APILeagueSeasonListSchema = z4.object({
    items: z4.array(
        z4.object({
            id: z4.string(),
        }),
    ),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APILeagueSeasonList>;

export const APIWarLeagueListSchema = z4.object({
    items: z4.array(APIWarLeagueSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APIWarLeagueList>;

export const APICapitalLeagueListSchema = z4.object({
    items: z4.array(APICapitalLeagueSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APICapitalLeagueList>;

// ************** LABELS ************** //

export const APILabelListSchema = z4.object({
    items: z4.array(APILabelSchema),
    paging: APIPagingSchema,
}) satisfies z4.ZodType<APILabelList>;

// *********** GOLD PASS *********** //

export const APIGoldPassSeasonSchema = z4.object({
    startTime: z4.string(),
    endTime: z4.string(),
}) satisfies z4.ZodType<APIGoldPassSeason>;
