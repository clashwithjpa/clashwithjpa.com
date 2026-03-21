import z4 from "zod/v4";
import type { auth } from "@lib/auth";
import type { RequestIdVariables } from "hono/request-id";

export type AppEnv = {
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    } & RequestIdVariables;
};

export const ErrorResponseSchema = z4.object({
    success: z4.literal(false),
    error: z4.union([z4.string(), z4.record(z4.string(), z4.unknown())]), // key type required in v4
});

export const SuccessResponseSchema = <T extends z4.ZodType>(
    dataSchema: T, // ZodTypeAny → ZodType in v4
) =>
    z4.object({
        success: z4.literal(true),
        data: dataSchema,
    });

export const ApiResponseSchema = <T extends z4.ZodType>(dataSchema: T) =>
    z4.discriminatedUnion("success", [SuccessResponseSchema(dataSchema), ErrorResponseSchema]);

export const UserSchema = z4.object({
    id: z4.string(),
    name: z4.string(),
    email: z4.string(),
    emailVerified: z4.boolean(),
    image: z4.string().nullish(),
    createdAt: z4.date(),
    updatedAt: z4.date(),
    role: z4.string().nullish(),
    banned: z4.boolean().nullish(),
    banReason: z4.string().nullish(),
    banExpires: z4.date().nullish(),
}) satisfies z4.ZodType<Partial<typeof auth.$Infer.Session.user>>;

export const SessionSchema = z4.object({
    id: z4.string(),
    expiresAt: z4.date(),
    token: z4.string(),
    createdAt: z4.date(),
    updatedAt: z4.date(),
    ipAddress: z4.string().nullish(),
    userAgent: z4.string().nullish(),
    userId: z4.string(),
    impersonatedBy: z4.string().nullish(),
}) satisfies z4.ZodType<Partial<typeof auth.$Infer.Session.session>>;
