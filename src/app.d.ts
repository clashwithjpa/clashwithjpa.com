import "unplugin-icons/types/svelte";
import type { UserData } from "$lib/auth/user";
import type { Db, Collection, Document } from "mongodb";
import type { UserData } from "$lib/auth/user";

declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            user: UserData | undefined;
            jpaDB: Db;
            jpaClanUsers: Collection<Document>;
        }
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}

export {};
