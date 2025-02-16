import { DATABASE_URL } from "$env/static/private";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "$lib/server/schema";
import { dev } from "$app/environment";

const client = neon(DATABASE_URL!);
export const db = drizzle(client, { schema, logger: dev });
