import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import "dotenv/config";

config({ path: ".env" });

export default defineConfig({
    schema: "./src/lib/server/schema.ts",
    out: "./src/lib/server/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!
    }
});
