import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.'),
    filter: z.string().optional().describe('Filter string for specific fields.'),
    sort: z.string().optional().describe('Sort order. Defaults to -id.')
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    url: z.string()
});

const ProviderMandateSchema = z.object({
    id: z.number(),
    external_reference: z.string().nullable(),
    customer: ProviderCustomerSchema.nullable(),
    status: z.string(),
    external_customer_account: z.string(),
    external_customer_label: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderMandateSchema)
});

const OutputCustomerSchema = z.object({
    id: z.number(),
    url: z.string()
});

const OutputMandateSchema = z.object({
    id: z.number(),
    external_reference: z.string().optional(),
    customer: OutputCustomerSchema.optional(),
    status: z.string(),
    external_customer_account: z.string(),
    external_customer_label: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(OutputMandateSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable()
});

const action = createAction({
    description: 'List GoCardless mandates',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_mandates:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getgocardlessmandates
            endpoint: '/api/external/v2/gocardless_mandates',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                ...(item.external_reference != null && { external_reference: item.external_reference }),
                ...(item.customer != null && {
                    customer: {
                        id: item.customer.id,
                        url: item.customer.url
                    }
                }),
                status: item.status,
                external_customer_account: item.external_customer_account,
                ...(item.external_customer_label != null && { external_customer_label: item.external_customer_label }),
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            has_more: providerResponse.has_more,
            next_cursor: providerResponse.next_cursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
