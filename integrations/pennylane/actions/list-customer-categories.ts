import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.number().describe('Customer ID. Example: 1338468995072'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    category_group_id: z.number().optional(),
    analytical_code: z.string().nullable().optional(),
    weight: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderCategorySchema),
    has_more: z.boolean().optional(),
    next_cursor: z.string().nullable().optional()
});

const CategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    category_group_id: z.number().optional(),
    analytical_code: z.string().optional(),
    weight: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CategorySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List categories assigned to a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomercategories
            endpoint: `/api/external/v2/customers/${encodeURIComponent(input.customer_id)}/categories`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.items.map((item) => ({
                id: item.id,
                label: item.label,
                ...(item.category_group_id !== undefined && { category_group_id: item.category_group_id }),
                ...(item.analytical_code != null && { analytical_code: item.analytical_code }),
                ...(item.weight !== undefined && { weight: item.weight })
            })),
            ...(parsed.next_cursor != null && { next_cursor: parsed.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
