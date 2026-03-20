import z4 from "zod/v4";

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
