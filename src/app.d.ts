import type { UserData } from "$lib/auth/user";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "$lib/server/schema";
import "unplugin-icons/types/svelte";

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            user: import("$lib/server/auth").SessionValidationResult["user"];
            session: import("$lib/server/auth").SessionValidationResult["session"];
        }
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

export {};
