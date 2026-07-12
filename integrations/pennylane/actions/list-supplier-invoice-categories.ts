import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Supplier invoice ID. Example: 25465885929472'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group: z.object({
        id: z.number()
    }),
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
    has_more: z.boolean(),
    next_cursor: z.string().optional(),
    items: z.array(ProviderCategorySchema)
});

const action = createAction({
    description: 'List categories for a supplier invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/getsupplierinvoicecategories
        const response = await nango.get({
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(input.id)}/categories`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor }),
            items: providerResponse.items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
