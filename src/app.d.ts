import type { UserData } from "$lib/auth/user";
import * as schema from "$lib/server/schema";
import "unplugin-icons/types/svelte";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            // db: NeonHttpDatabase<typeof schema> & {
            //     $client: NeonQueryFunction<false, false>;
            // };
            db: NodePgDatabase<typeof schema> & {
                $client: Pool;
            };
            user: UserData | null;
        }
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

export {};
