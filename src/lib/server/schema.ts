import type { APIClan, APIClanWar, APIPlayer } from "$lib/coc/types";
import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const userTable = pgTable("user_table", {
    id: serial("id").primaryKey(),
    discordId: text("discord_id").notNull().unique(),
    isActive: boolean("is_active").notNull().default(true)
});

export const cocTable = pgTable("coc_table", {
    id: serial("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => userTable.discordId, { onDelete: "cascade" }),
    tag: text("tag").notNull().unique()
});

export const cwlTable = pgTable(
    "cwl_table",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id").notNull(),
        userName: text("user_name").notNull(),
        accountName: text("account_name").notNull(),
        accountTag: text("account_tag").notNull(),
        accountClan: text("account_clan").notNull(),
        accountWeight: integer("account_weight").notNull(),
        month: text("month").notNull(),
        year: integer("year").notNull(),
        preferenceNum: integer("preference_num").notNull(),
        appliedAt: timestamp("applied_at").notNull().defaultNow()
        // assignedTo: text("assigned_to").references(() => cwlClanTable.tag)
    },
    (t) => [unique("cwl_table_accountTag_preferenceNum_month_year_unique").on(t.accountTag, t.preferenceNum, t.month, t.year)]
);

export const clanTable = pgTable("clan_table", {
    id: serial("id").primaryKey(),
    clanCode: text("clan_code").notNull(),
    clanName: text("clan_name"),
    clanLevel: integer("clan_level"),
    clanTag: text("clan_tag").notNull(),
    clanRoleID: text("clan_role_id").notNull(),
    memberRoleID: text("member_role_id").notNull(),
    elderRoleID: text("elder_role_id").notNull(),
    coleaderRoleID: text("coleader_role_id").notNull(),
    leaderRoleID: text("leader_role_id").notNull(),
    leaderID: text("leader_id").notNull(),
    channelID: text("channel_id").notNull(),
    attacksRequirement: integer("attacks_requirement").notNull(),
    donationsRequirement: integer("donations_requirement").notNull(),
    clangamesRequirement: integer("clangames_requirement").notNull(),
    clanData: jsonb("clan_data").$type<APIClan>(),
    clanCurrentWar: jsonb("clan_current_war").$type<APIClanWar>()
});

export const baseTable = pgTable("base_table", {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    baseLink: text("base_link").notNull(),
    imageLink: text("image_link").notNull()
});

export const applicationStatusEnum = pgEnum("application_status", ["pending", "accepted", "rejected"]);
export const clanApplicationTable = pgTable("clan_application_table", {
    id: serial("id").primaryKey(),
    tag: text("tag").notNull().unique(),
    playerData: jsonb("player_data").$type<APIPlayer>().notNull(),
    discordId: text("discord_id").notNull(),
    status: applicationStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow()
});

// export const cwlClanTable = pgTable("cwl_clan_table", {
//     tag: text("tag").notNull().primaryKey(),
//     clanName: text("clan_name").notNull()
// });

// export const cwlRelations = relations(cwlTable, ({ one }) => ({
//     assignedClan: one(cwlClanTable, {
//         fields: [cwlTable.assignedTo],
//         references: [cwlClanTable.tag]
//     })
// }));

export const userRelations = relations(userTable, ({ many }) => ({
    cocAccounts: many(cocTable)
}));

export const cocRelations = relations(cocTable, ({ one }) => ({
    user: one(userTable, {
        fields: [cocTable.userId],
        references: [userTable.discordId]
    })
}));

interface SettingsMap {
    applications_enabled: boolean;
    cwl_enabled: boolean;
    admin_roles_id: string[];
    admin_members_id: string[];
    rules: {
        content: string;
    };
    guild_id: {
        value: string;
    };
}

export const settingsTable = pgTable("settings_table", {
    key: text("key").$type<keyof SettingsMap>().primaryKey(),
    value: jsonb("value").$type<SettingsMap[keyof SettingsMap]>().notNull()
});

export type InsertUser = typeof userTable.$inferInsert;
export type SelectUser = typeof userTable.$inferSelect;

export type InsertCoc = typeof cocTable.$inferInsert;
export type SelectCoc = typeof cocTable.$inferSelect;

export type InsertClan = typeof clanTable.$inferInsert;
export type SelectClan = typeof clanTable.$inferSelect;

export type InsertBase = typeof baseTable.$inferInsert;
export type SelectBase = typeof baseTable.$inferSelect;

export type InsertClanApplication = typeof clanApplicationTable.$inferInsert;
export type SelectClanApplication = typeof clanApplicationTable.$inferSelect;

export type InsertSettings = typeof settingsTable.$inferInsert;
export type SelectSettings = typeof settingsTable.$inferSelect;

export type InsertCWL = typeof cwlTable.$inferInsert;
export type SelectCWL = typeof cwlTable.$inferSelect;
