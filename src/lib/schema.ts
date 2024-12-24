import { z } from "zod";

export const clanApplicationSchema = z.object({
    tag: z.string().min(5).startsWith("#"),
    apiToken: z.string().nonempty(),
    "cf-turnstile-response": z.string().nonempty()
});
