// Generated by ts-to-zod
import { z } from 'zod';

export const idEntitySchema = z.object({
    id: z.string()
});

export const successResponseSchema = z.object({
    success: z.boolean()
});

export const userSchema = z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string()
});

export const createUserSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string()
});

export const perimeter81CreateUserSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    idpType: z.string().optional(),
    accessGroups: z.array(z.string()).optional(),
    emailVerified: z.boolean().optional(),
    inviteMessage: z.string().optional(),
    origin: z.string().optional(),
    profileData: z
        .object({
            roleName: z.string().optional(),
            phone: z.string().optional(),
            icon: z.string().optional(),
            origin: z.string().optional()
        })
        .optional()
});