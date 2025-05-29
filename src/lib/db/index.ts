import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';
import { dev } from '$app/environment';
import * as schema from './schema';

const client = postgres(DATABASE_URL);
export const db = drizzle(client, {
	schema: schema,
	logger: dev
});
