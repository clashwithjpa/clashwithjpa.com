import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { config } from "@/lib/config";

const pool = new Pool({
    connectionString: config.JPA_DATABASE_URL,
    statement_timeout: 30_000,
    query_timeout: 30_000,
});

export const db = drizzle({ client: pool, schema });
