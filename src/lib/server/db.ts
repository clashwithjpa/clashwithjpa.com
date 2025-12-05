import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import * as schema from "$lib/server/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const client = neon(env.DATABASE_URL!);
export const db = drizzle(client, { schema, logger: dev });
