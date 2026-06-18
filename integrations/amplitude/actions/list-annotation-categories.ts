import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of items to return. Default: 100.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    category: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderCategorySchema)
});

const CategorySchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const OutputSchema = z.object({
    categories: z.array(CategorySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List annotation categories.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const connection = await nango.getConnection();
        const hostname = connection.connection_config?.['hostname'] ?? 'amplitude.com';

        const baseUrlOverride = hostname === 'amplitude.com' ? undefined : `https://${hostname}`;

        // https://amplitude.com/docs/apis/analytics/chart-annotations
        const response = await nango.get({
            endpoint: '/api/3/annotation-categories',
            ...(baseUrlOverride && { baseUrlOverride }),
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const categories = providerResponse.data;

        const limit = input.limit ?? 100;
        if (!Number.isInteger(limit) || limit < 1) {
            throw new nango.ActionError({
                type: 'invalid_limit',
                message: 'limit must be a positive integer.'
            });
        }
        const cursor = input.cursor !== undefined ? Number(input.cursor) : 0;
        if (!Number.isInteger(cursor) || cursor < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer string.'
            });
        }

        const paginatedCategories = categories.slice(cursor, cursor + limit);
        const nextCursor = cursor + limit < categories.length ? String(cursor + limit) : undefined;

        return {
            categories: paginatedCategories.map((item) => ({
                id: item.id,
                ...(item.category !== undefined && { name: item.category })
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
