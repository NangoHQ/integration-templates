import { z } from 'zod';
import { createAction } from 'nango';

const ProviderCategorySchema = z.object({
    id: z.number().describe('Category ID. Example: 32'),
    name: z.string().describe('Category name. Example: "Strategic Objectives"'),
    type: z.string().describe('Category type. Example: "milestone"'),
    color: z.string().nullable().optional().describe('Category color hex code. Example: "#000000"'),
    entity_type: z.string().optional().describe('Entity type string. Example: "category"'),
    external_id: z.string().nullable().optional().describe('External ID reference.'),
    created_at: z.string().optional().describe('ISO 8601 creation timestamp.'),
    updated_at: z.string().optional().describe('ISO 8601 update timestamp.')
});

const OutputSchema = z.array(
    z.object({
        id: z.number().describe('Category ID.'),
        name: z.string().describe('Category name.'),
        type: z.string().describe('Category type.'),
        color: z.string().optional().describe('Category color hex code.'),
        entity_type: z.string().optional().describe('Entity type string.'),
        external_id: z.string().optional().describe('External ID reference.'),
        created_at: z.string().optional().describe('ISO 8601 creation timestamp.'),
        updated_at: z.string().optional().describe('ISO 8601 update timestamp.')
    })
);

const action = createAction({
    description: 'List categories (used to group Objectives/Milestones).',
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,

    exec: async (nango, _input) => {
        const response = await nango.get({
            // https://developer.shortcut.com/api/rest/v3#List-Categories
            endpoint: '/api/v3/categories',
            retries: 3
        });

        const rawCategories = z.array(z.unknown()).parse(response.data);
        const categories = rawCategories.map((item) => {
            const category = ProviderCategorySchema.parse(item);
            return {
                id: category.id,
                name: category.name,
                type: category.type,
                ...(category.color != null && { color: category.color }),
                ...(category.entity_type !== undefined && { entity_type: category.entity_type }),
                ...(category.external_id != null && { external_id: category.external_id }),
                ...(category.created_at !== undefined && { created_at: category.created_at }),
                ...(category.updated_at !== undefined && { updated_at: category.updated_at })
            };
        });

        return categories;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
