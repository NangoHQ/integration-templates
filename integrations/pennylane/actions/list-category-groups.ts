import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.')
});

const CategoryGroupSchema = z.object({
    id: z.number(),
    label: z.string(),
    categories: z.object({
        url: z.string()
    }),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(CategoryGroupSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List analytical category groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['categories:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getcategorygroups
            endpoint: '/api/external/v2/category_groups',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                has_more: z.boolean(),
                next_cursor: z.string().nullable(),
                items: z.array(CategoryGroupSchema)
            })
            .parse(response.data);

        return {
            items: providerResponse.items,
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
