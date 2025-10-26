import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: process.env.DRIZZLE_SCHEMA_PATH || './src/lib/server/db/schema',
	out: process.env.DRIZZLE_MIGRATIONS_PATH || './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true
});
