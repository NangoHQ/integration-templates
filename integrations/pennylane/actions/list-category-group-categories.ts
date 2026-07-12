import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_group_id: z.number().describe('The unique identifier of the category group. Example: 14148939776'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    direction: z.enum(['cash_in', 'cash_out']).nullable(),
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderCategorySchema)
});

const CategoryOutputSchema = z.object({
    id: z.number(),
    label: z.string(),
    direction: z.enum(['cash_in', 'cash_out']).optional(),
    analytical_code: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(CategoryOutputSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List categories belonging to a category group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['categories:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcategorygroupcategories
            endpoint: `/api/external/v2/category_groups/${encodeURIComponent(String(input.category_group_id))}/categories`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                label: item.label,
                ...(item.direction != null && { direction: item.direction }),
                ...(item.analytical_code != null && { analytical_code: item.analytical_code }),
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor }),
            has_more: providerResponse.has_more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
