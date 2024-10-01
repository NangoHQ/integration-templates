// Generated by ts-to-zod
import { z } from 'zod';

export const richPageInputSchema = z.object({
    pageId: z.string()
});

export const contentMetadataSchema = z.object({
    id: z.string(),
    path: z.string().optional(),
    type: z.union([z.literal('page'), z.literal('database')]),
    last_modified: z.string(),
    title: z.string().optional(),
    parent_id: z.union([z.string(), z.undefined()]).optional()
});

export const richPageSchema = z.object({
    id: z.string(),
    path: z.string(),
    title: z.string(),
    content: z.string(),
    contentType: z.string(),
    meta: z.record(z.any()),
    last_modified: z.string(),
    parent_id: z.union([z.string(), z.undefined()]).optional()
});

export const databaseInputSchema = z.object({
    databaseId: z.string()
});

export const databaseEntrySchema = z.record(z.string());

export const databaseSchema = z.object({
    id: z.string(),
    path: z.string(),
    title: z.string(),
    meta: z.record(z.any()),
    last_modified: z.string(),
    entries: z.array(databaseEntrySchema),
    schema: z.record(
        z.object({
            type: z.string(),
            value: z.any()
        })
    )
});

export const urlOrIdSchema = z.object({
    url: z.string().optional(),
    id: z.string().optional()
});