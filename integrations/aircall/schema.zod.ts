// Generated by ts-to-zod
import { z } from 'zod';

export const successResponseSchema = z.object({
    success: z.boolean()
});

export const idEntitySchema = z.object({
    id: z.string()
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
