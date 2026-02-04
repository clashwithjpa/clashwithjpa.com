import { defineConfig } from 'drizzle-kit';
import 'dotenv/config'

if (!process.env.JPA_DATABASE_URL) throw new Error('JPA_DATABASE_URL is not set');

export default defineConfig({
    schema: process.env.JPA_DRIZZLE_SCHEMA_PATH || './src/lib/db/schema',
    out: process.env.JPA_DRIZZLE_MIGRATIONS_PATH || './drizzle',
    dialect: 'postgresql',
    dbCredentials: { url: process.env.JPA_DATABASE_URL },
    verbose: true,
    strict: true,
});
