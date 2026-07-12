import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The unique identifier of the category. Example: 239432757248')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    direction: z.enum(['cash_in', 'cash_out']).nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    category_group: z.object({
        id: z.number()
    }),
    analytical_code: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    label: z.string(),
    direction: z.enum(['cash_in', 'cash_out']).optional(),
    created_at: z.string(),
    updated_at: z.string(),
    category_group_id: z.number(),
    analytical_code: z.string().optional()
});

const action = createAction({
    description: 'Retrieve an analytical category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['categories:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcategory
            endpoint: `/api/external/v2/categories/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Category not found',
                id: input.id
            });
        }

        const category = ProviderCategorySchema.parse(response.data);

        return {
            id: category.id,
            label: category.label,
            ...(category.direction != null && { direction: category.direction }),
            created_at: category.created_at,
            updated_at: category.updated_at,
            category_group_id: category.category_group.id,
            ...(category.analytical_code != null && { analytical_code: category.analytical_code })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
