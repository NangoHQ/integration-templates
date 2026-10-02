import { z } from 'zod';

export const ClarifyPaginationMeta = z.object({
    totalRecords: z.number(),
    totalPages: z.number(),
    offset: z.number(),
    limit: z.number()
});

export type ClarifyPaginationMeta = z.infer<typeof ClarifyPaginationMeta>;

export const ClarifyList = z.object({
    id: z.string(),
    title: z.string(),
    entity: z.string(),
    emoji: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().optional(),
    state: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

export type ClarifyList = z.infer<typeof ClarifyList>;

export const ClarifyResource = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.record(z.string(), z.unknown())
});

export type ClarifyResource = z.infer<typeof ClarifyResource>;

export const models = {
    ClarifyPaginationMeta,
    ClarifyList,
    ClarifyResource
};
