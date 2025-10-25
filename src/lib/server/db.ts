import { DATABASE_URL } from "$env/static/private";
import * as schema from "$lib/server/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const client = neon(DATABASE_URL!);
export const db = drizzle(client, { schema });
