import * as schema from "$lib/server/schema";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { APIUser } from "discord-api-types/v10";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import "unplugin-icons/types/svelte";

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            db: NeonHttpDatabase<typeof schema> & {
                $client: NeonQueryFunction<false, false>;
            };
            user: APIUser | null;
        }
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

export { };

