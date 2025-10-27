import {
	boolean,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
	index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { account } from './ba-auth';

export const settingsTable = pgTable('settings_table', {
	id: serial('id').primaryKey(), // Only one row expected
	applicationsEnabled: boolean('applications_enabled').notNull().default(false),
	cwlEnabled: boolean('cwl_enabled').notNull().default(false),
	siteMaintenanceMode: boolean('site_maintenance_mode').notNull().default(false),
	rulesContent: text('rules_content'),
	guildId: text('guild_id'),
	updatedAt: timestamp('updated_at').defaultNow()
});

export const baseInfoTable = pgTable('base_info_table', {
	id: serial('id').primaryKey(),
	cocBaseLevel: text('coc_base_level').notNull().unique(),
	cocBaseLink: text('coc_base_link').notNull(),
	cocBaseImageLink: text('coc_base_image_link').notNull()
});

export const cocAccountTable = pgTable(
	'coc_account_table',
	{
		id: serial('id').primaryKey(),
		discordUserId: text('discord_user_id')
			.notNull()
			.references(() => account.accountId, { onDelete: 'cascade' }),
		cocAccountTag: text('coc_account_tag').notNull().unique()
	},
	(t) => [index('coc_account_discord_user_id_idx').on(t.discordUserId)]
);

export const clanTable = pgTable(
	'clan_info_table',
	{
		id: serial('id').primaryKey(),
		cocClanCode: text('coc_clan_code').notNull().unique(),
		cocClanName: text('coc_clan_name'),
		cocClanLevel: integer('coc_clan_level'),
		cocClanTag: text('coc_clan_tag').notNull().unique(),
		discordClanRoleId: text('discord_clan_role_id').notNull(),
		discordClanChannelId: text('discord_clan_channel_id').notNull(),
		discordMemberRoleId: text('discord_member_role_id').notNull(),
		discordElderRoleId: text('discord_elder_role_id').notNull(),
		discordColeaderRoleId: text('discord_coleader_role_id').notNull(),
		discordLeaderRoleId: text('discord_leader_role_id').notNull(),
		discordLeaderId: text('discord_leader_id').notNull(),
		attacksRequirement: integer('attacks_requirement').notNull(),
		donationsRequirement: integer('donations_requirement').notNull(),
		clangamesRequirement: integer('clangames_requirement').notNull(),
		cocClanData: jsonb('coc_clan_data'),
		cocClanCurrentWarData: jsonb('coc_clan_current_war_data')
	},
	(t) => [
		index('clan_info_coc_clan_code_idx').on(t.cocClanCode),
		index('clan_info_coc_clan_tag_idx').on(t.cocClanTag),
		index('clan_info_coc_clan_level_idx').on(t.cocClanLevel)
	]
);

export const clanApplicationStatusEnum = pgEnum('clan_application_status', [
	'pending',
	'accepted',
	'rejected'
]);
export const clanApplicationTable = pgTable('clan_application_table', {
	id: serial('id').primaryKey(),
	cocAccountTag: text('coc_account_tag').notNull().unique(),
	cocAccountData: jsonb('coc_account_data').notNull(),
	discordUserId: text('discord_user_id').notNull(),
	status: clanApplicationStatusEnum('status').notNull().default('pending'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const cwlClanInfoTable = pgTable(
	'cwl_clan_info_table',
	{
		cocClanTag: text('coc_clan_tag').notNull().primaryKey(),
		cocClanName: text('coc_clan_name').notNull(),
		cocClanLeague: text('coc_clan_league').notNull(),
		cocClanLeader: text('coc_clan_leader').notNull(),
		email: text('email').notNull()
	},
	(t) => [index('cwl_clan_info_coc_clan_tag_idx').on(t.cocClanTag)]
);

export const cwlApplicationTable = pgTable(
	'cwl_application_table',
	{
		id: serial('id').primaryKey(),
		discordUserId: text('discord_user_id').notNull(),
		discordUsername: text('discord_username').notNull(),
		cocAccountName: text('coc_account_name').notNull(),
		cocAccountTag: text('coc_account_tag').notNull(),
		cocAccountClan: text('coc_account_clan').notNull(),
		cocAccountWeight: integer('coc_account_weight').notNull(),
		month: text('month').notNull(),
		year: integer('year').notNull(),
		preferenceNum: integer('preference_num').notNull(),
		appliedAt: timestamp('applied_at').notNull().defaultNow(),
		assignedTo: text('assigned_to').references(() => cwlClanInfoTable.cocClanTag, {
			onDelete: 'cascade'
		})
	},
	(t) => [
		unique('cwl_table_accountTag_preferenceNum_month_year_unique').on(
			t.cocAccountTag,
			t.preferenceNum,
			t.month,
			t.year
		),
		index('cwl_application_discord_user_id_idx').on(t.discordUserId)
	]
);

export const cwlRelations = relations(cwlApplicationTable, ({ one }) => ({
	assignedClan: one(cwlClanInfoTable, {
		fields: [cwlApplicationTable.assignedTo],
		references: [cwlClanInfoTable.cocClanTag]
	})
}));

export const accountRelations = relations(account, ({ many }) => ({
	cocAccounts: many(cocAccountTable)
}));

export const cocAccountRelations = relations(cocAccountTable, ({ one }) => ({
	user: one(account, {
		fields: [cocAccountTable.discordUserId],
		references: [account.accountId]
	})
}));
