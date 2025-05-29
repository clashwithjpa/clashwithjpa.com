-- Admin has full access
INSERT INTO "role_permissions" ("role", "permission") VALUES
('admin', 'read.all'),
('admin', 'write.all');

-- CWL Manager permissions
INSERT INTO "role_permissions" ("role", "permission") VALUES
('cwl_manager', 'read.cwl_applications'),
('cwl_manager', 'write.cwl_applications');

-- Join Manager permissions
INSERT INTO "role_permissions" ("role", "permission") VALUES
('join_manager', 'read.join_applications'),
('join_manager', 'write.join_applications');

-- Clan Manager permissions
INSERT INTO "role_permissions" ("role", "permission") VALUES
('clan_manager', 'read.clans'),
('clan_manager', 'write.clans');

-- User Manager permissions
INSERT INTO "role_permissions" ("role", "permission") VALUES
('user_manager', 'read.users'),
('user_manager', 'write.users');

-- Rule Manager permissions
INSERT INTO "role_permissions" ("role", "permission") VALUES
('rule_manager', 'read.rules'),
('rule_manager', 'write.rules');

-- Setting Manager permissions
INSERT INTO "role_permissions" ("role", "permission") VALUES
('setting_manager', 'read.settings'),
('setting_manager', 'write.settings');

-- Base Manager permissions
INSERT INTO "role_permissions" ("role", "permission") VALUES
('base_manager', 'read.bases'),
('base_manager', 'write.bases');

-- CoC Account Manager permissions
INSERT INTO "role_permissions" ("role", "permission") VALUES
('coc_account_manager', 'read.coc_accounts'),
('coc_account_manager', 'write.coc_accounts');
