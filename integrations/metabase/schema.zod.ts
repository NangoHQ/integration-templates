import { z } from 'zod';

export const UserSchema = z.object({
    id: z.union([z.string(), z.number()]).transform((value) => String(value)),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email()
});

export const updateUserSchema = z.object({
    id: z.number().int().positive(),
    email: z.string().email().nullable(),
    first_name: z.string().min(1).nullable(),
    last_name: z.string().min(1).nullable(),
    is_group_manager: z.boolean().nullable(),
    locale: z
        .string()
        .regex(/^[a-z]{2}(_[A-Z]{2})?$/)
        .nullable(),
    user_group_memberships: z
        .array(
            z.object({
                id: z.number().int().positive(),
                is_group_manager: z.boolean().optional()
            })
        )
        .nullable(),
    is_superuser: z.boolean().nullable(),
    login_attributes: z.record(z.string(), z.string()).nullable()
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
