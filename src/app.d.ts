import type { UserData } from "$lib/auth/user";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import "unplugin-icons/types/svelte";

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            db: NeonHttpDatabase<Record<string, never>> & {
                $client: NeonQueryFunction<false, false>;
            };
            user: UserData | undefined;
        }
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

export {};
