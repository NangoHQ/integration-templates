import { z } from 'zod';

export const UserSchema = z.object({
    id: z.union([z.string(), z.number()]).transform((value) => String(value)),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email()
});

export const CreateUserInputSchema = UserSchema.omit({ id: true }).extend({
    optionalProperties: z.record(z.string()).optional()
});

export const DeleteUserInputSchema = z.object({
    email: z.string().email()
});

export const SuccessResponseSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});
