import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.JPA_DATABASE_URL;
if (!url) {
    console.error("JPA_DATABASE_URL is not set");
    process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

console.log("[migrate] running migrations...");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("[migrate] complete");

await pool.end();
