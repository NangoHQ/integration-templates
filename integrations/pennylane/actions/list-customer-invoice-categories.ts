import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    customer_invoice_id: z.number().int().positive().describe('Customer invoice ID. Example: 25461646082048'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per page (1-100). Defaults to 20.')
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

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderCategorySchema),
    next_cursor: z.string().nullable(),
    has_more: z.boolean()
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
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List categories for a customer invoice',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all', 'customer_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getcustomerinvoicecategories
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(String(input.customer_invoice_id))}/categories`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                label: item.label,
                weight: item.weight,
                category_group: item.category_group,
                ...(item.analytical_code !== null && { analytical_code: item.analytical_code }),
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            ...(providerResponse.next_cursor !== null && { next_cursor: providerResponse.next_cursor }),
            has_more: providerResponse.has_more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
