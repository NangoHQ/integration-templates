import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per page. Defaults to 20, max 100.')
});

const CategoryGroupSchema = z.object({
    id: z.number()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    direction: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    category_group: CategoryGroupSchema,
    analytical_code: z.string().nullable()
});

const ListResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderCategorySchema)
});

const CategoryOutputSchema = z.object({
    id: z.number(),
    label: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    category_group: CategoryGroupSchema,
    direction: z.string().optional(),
    analytical_code: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CategoryOutputSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List analytical categories.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['categories:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getcategories
            endpoint: '/api/external/v2/categories',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const listResponse = ListResponseSchema.parse(response.data);

        return {
            items: listResponse.items.map((item) => ({
                id: item.id,
                label: item.label,
                created_at: item.created_at,
                updated_at: item.updated_at,
                category_group: item.category_group,
                ...(item.direction != null && { direction: item.direction }),
                ...(item.analytical_code != null && { analytical_code: item.analytical_code })
            })),
            has_more: listResponse.has_more,
            ...(listResponse.next_cursor != null && { next_cursor: listResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
