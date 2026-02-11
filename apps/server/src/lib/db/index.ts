import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import "dotenv/config";

if (!process.env.JPA_DATABASE_URL) throw new Error("JPA_DATABASE_URL is not set");

const pool = new Pool({
    connectionString: process.env.JPA_DATABASE_URL,
});

export const db = drizzle({ client: pool, schema });
