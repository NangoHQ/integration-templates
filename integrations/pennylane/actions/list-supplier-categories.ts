import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    supplier_id: z.number().describe('Supplier ID. Example: 1338485968896'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.')
});

const ProviderCategoryGroupSchema = z.object({
    id: z.number()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group: ProviderCategoryGroupSchema,
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderCategorySchema)
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            label: z.string(),
            weight: z.string(),
            category_group: z.object({
                id: z.number()
            }),
            analytical_code: z.string().optional(),
            created_at: z.string(),
            updated_at: z.string()
        })
    ),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List categories assigned to a supplier.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['suppliers:readonly', 'suppliers:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getsuppliercategories
            endpoint: `/api/external/v2/suppliers/${encodeURIComponent(String(input.supplier_id))}/categories`,
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
                weight: item.weight,
                category_group: {
                    id: item.category_group.id
                },
                ...(item.analytical_code != null && { analytical_code: item.analytical_code }),
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
