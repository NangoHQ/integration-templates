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

export const phoneNumberSchema = z.object({
    type: z.union([z.literal('work'), z.literal('mobile'), z.literal('other')]),
    value: z.string()
});

export const photoSchema = z.object({
    type: z.union([z.literal('photo'), z.literal('thumbnail')]),
    value: z.string()
});

export const addressSchema = z.object({
    type: z.literal('work'),
    streetAddress: z.string().optional(),
    locality: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional()
});

export const keeperCreateUserSchema = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    active: z.boolean().optional(),
    externalId: z.string().optional(),
    phoneNumbers: z.array(phoneNumberSchema).optional(),
    photos: z.array(photoSchema).optional(),
    addresses: z.array(addressSchema).optional(),
    title: z.string().optional()
});