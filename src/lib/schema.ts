import { dev } from "$app/environment";
import { z } from "zod";

export const clanApplicationSchema = z.object({
    tag: z.string().min(5).max(10).startsWith("#"),
    apiToken: z.string().nonempty(),
    "cf-turnstile-response": dev ? z.string() : z.string().nonempty()
});

export const cwlApplicationSchema = z.object({
    isAlt: z.boolean().default(false),
    tag: z.string().min(5).max(10).startsWith("#"),
    accountClan: z.string().optional(),
    preferenceNum: z.number().int().min(1).max(99).default(1),
    accountWeight: z.number().int().min(1).default(1).optional(),
    "cf-turnstile-response": dev ? z.string() : z.string().nonempty()
});

export const customCWLEntrySchema = z.object({
    userId: z.string().nonempty(),
    tag: z.string().min(5).max(10).startsWith("#"),
    accountClan: z.string().nonempty(),
    accountWeight: z.number().int().min(1).default(1),
    preferenceNum: z.number().int().min(1).default(1)
});
