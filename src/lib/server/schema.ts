import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const userTable = pgTable("user_table", {
    id: serial("id").primaryKey(),
    discordId: text("discord_id").notNull().unique(),
    isActive: boolean("is_active").notNull().default(true)
});

export const cocTable = pgTable("coc_table", {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => userTable.discordId, { onDelete: "cascade" }),
    tag: text("tag").notNull()
});

export const clanTable = pgTable("clan_table", {
    id: serial("id").primaryKey(),
    clanCode: text("clan_code").notNull(),
    clanName: text("clan_name").notNull(),
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
    clangamesRequirement: integer("clangames_requirement").notNull()
});

export const baseTable = pgTable("base_table", {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    baseLink: text("base_link").notNull(),
    imageLink: text("image_link").notNull()
});

export const clanApplicationTable = pgTable("clan_application_table", {
    id: serial("id").primaryKey(),
    tag: text("tag").notNull(),
    accountLevel: integer("account_level").notNull(),
    discordId: text("discord_id").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow()
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
