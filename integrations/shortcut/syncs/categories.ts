import { createSync } from 'nango';
import { z } from 'zod';

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string().optional(),
    color: z.string().optional().nullable(),
    external_id: z.string().optional().nullable(),
    archived: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    entity_type: z.string().optional()
});

const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    color: z.string().optional(),
    external_id: z.string().optional(),
    archived: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    entity_type: z.string().optional()
});

const sync = createSync({
    description: 'Sync categories (used to group Objectives).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Category: CategorySchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/v3/categories returns a flat, unpaginated array with no
        // updated_at filter, no cursor, no page token, and no deleted-record endpoint.
        // It is small reference data meant to be fetched as a full snapshot.
        await nango.trackDeletesStart('Category');

        // https://developer.shortcut.com/api/rest/v3#List-Categories
        const response = await nango.get({
            endpoint: '/api/v3/categories',
            retries: 3
        });

        const parsed = z.array(ProviderCategorySchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse categories response: ${parsed.error.message}`);
        }

        const categories = parsed.data.map((category) => ({
            id: String(category.id),
            name: category.name,
            ...(category.type !== undefined && { type: category.type }),
            ...(category.color != null && { color: category.color }),
            ...(category.external_id != null && { external_id: category.external_id }),
            ...(category.archived !== undefined && { archived: category.archived }),
            ...(category.created_at !== undefined && { created_at: category.created_at }),
            ...(category.updated_at !== undefined && { updated_at: category.updated_at }),
            ...(category.entity_type !== undefined && { entity_type: category.entity_type })
        }));

        if (categories.length > 0) {
            await nango.batchSave(categories, 'Category');
        }

        await nango.trackDeletesEnd('Category');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
