import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access';

/*
By default, there are two resources with up to six permissions.

user: create list set-role ban impersonate delete set-password
session: list revoke delete
*/

const statement = {
	...defaultStatements,
	coc: ['apply', 'cwl', 'review', 'manage']
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
	coc: ['apply', 'cwl', 'review', 'manage'],
	...adminAc.statements
});

export const unverified = ac.newRole({
	coc: ['apply']
});

export const verified = ac.newRole({
	coc: ['apply', 'cwl']
});

export const reviewer = ac.newRole({
	coc: ['apply', 'cwl', 'review']
});

export const manager = ac.newRole({
	coc: ['apply', 'cwl', 'review', 'manage']
});
