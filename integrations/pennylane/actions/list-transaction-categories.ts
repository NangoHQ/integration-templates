import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    transaction_id: z.string().describe('The unique identifier of the bank transaction. Example: "123"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string().nullable().optional(),
    amount: z.string().nullable().optional(),
    direction: z.string().nullable().optional(),
    category_group_id: z.number().nullable().optional(),
    analytical_code: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderCategorySchema).optional(),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean().optional()
});

const CategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string().optional(),
    amount: z.string().optional(),
    direction: z.string().optional(),
    category_group_id: z.number().optional(),
    analytical_code: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    categories: z.array(CategorySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List categories assigned to a bank transaction.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 20;
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            throw new nango.ActionError({
                type: 'invalid_limit',
                message: 'limit must be an integer between 1 and 100.'
            });
        }

        const params: Record<string, string | number> = {
            limit: limit
        };
        if (input.cursor !== undefined && input.cursor !== '') {
            params['cursor'] = input.cursor;
        }

        // https://pennylane.readme.io/reference/gettransactioncategories
        const response = await nango.get({
            endpoint: `/api/external/v2/transactions/${encodeURIComponent(input.transaction_id)}/categories`,
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const categories = (providerResponse.items ?? []).map((category) => ({
            id: category.id,
            label: category.label,
            ...(category.weight !== undefined && category.weight !== null && { weight: category.weight }),
            ...(category.amount !== undefined && category.amount !== null && { amount: category.amount }),
            ...(category.direction !== undefined && category.direction !== null && { direction: category.direction }),
            ...(category.category_group_id !== undefined && category.category_group_id !== null && { category_group_id: category.category_group_id }),
            ...(category.analytical_code !== undefined && category.analytical_code !== null && { analytical_code: category.analytical_code }),
            ...(category.created_at !== undefined && { created_at: category.created_at }),
            ...(category.updated_at !== undefined && { updated_at: category.updated_at })
        }));

        return {
            categories: categories,
            ...(providerResponse.next_cursor !== undefined &&
                providerResponse.next_cursor !== null && {
                    next_cursor: providerResponse.next_cursor
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
