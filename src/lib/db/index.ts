import { Kysely, PostgresDialect } from 'kysely';
import type { DB } from './types';
import { Pool } from 'pg';
import { DATABASE_URL } from '$env/static/private';

export const db = new Kysely<DB>({
	dialect: new PostgresDialect({
		pool: new Pool({
			connectionString: DATABASE_URL
		})
	})
});
