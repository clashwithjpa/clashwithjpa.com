import * as z from 'zod';

export const cwlApplicationSchema = z.object({
	isAlt: z.boolean().default(false),
	tag: z.string().min(5).max(10).startsWith('#'),
	accountClan: z.string().optional(),
	preferenceNum: z.number().int().min(1).max(99).default(1),
	accountWeight: z.number().int().min(1).default(1).optional(),
	'cf-turnstile-response': z.string().nonempty()
});

export const customCWLEntrySchema = z.object({
	userId: z.string().nonempty(),
	tag: z.string().min(5).max(10).startsWith('#'),
	accountClan: z.string().nonempty(),
	accountWeight: z.number().int().min(1).default(1),
	preferenceNum: z.number().int().min(1).default(1)
});

export type CwlApplicationSchema = z.infer<typeof cwlApplicationSchema>;
export type CustomCWLEntrySchema = z.infer<typeof customCWLEntrySchema>;
