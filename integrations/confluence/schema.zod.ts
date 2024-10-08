// Generated by ts-to-zod
import { z } from 'zod';

export const confluenceSpaceSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.string(),
    authorId: z.string(),
    createdAt: z.string(),
    homepageId: z.string(),
    description: z.string()
});

export const confluencePageSchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    status: z.string(),
    authorId: z.string(),
    createdAt: z.string(),
    spaceId: z.string(),
    parentId: z.string(),
    parentType: z.string(),
    position: z.number(),
    version: z.object({
        createdAt: z.string(),
        message: z.string(),
        number: z.number(),
        minorEdit: z.boolean(),
        authorId: z.string()
    }),
    body: z.object({
        storage: z.record(z.any()),
        atlas_doc_format: z.record(z.any())
    })
});
