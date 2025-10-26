import * as z from 'zod';

export const clanApplicationSchema = z.object({
	tag: z.string().min(5).max(10).startsWith('#'),
	apiToken: z.string().nonempty(),
	'cf-turnstile-response': z.string().nonempty()
});

export type ClanApplicationSchema = z.infer<typeof clanApplicationSchema>;
