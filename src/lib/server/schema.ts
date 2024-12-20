import { integer, pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users_table", {
    id: integer("id").primaryKey(),
    username: text("username").notNull(),
    isClanMember: boolean("is_clan_member").notNull().default(false)
});

export const cocTable = pgTable("coc_table", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    tag: text("tag").notNull()
});

export type InsertUser = typeof usersTable.$inferInsert
export type SelectUser = typeof usersTable.$inferSelect

export type InsertCoc = typeof cocTable.$inferInsert
export type SelectCoc = typeof cocTable.$inferSelect