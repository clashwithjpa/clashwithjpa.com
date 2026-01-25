import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import * as schema from "$lib/server/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: env.DATABASE_URL!
});

export const db = drizzle(pool, { schema, logger: dev });
