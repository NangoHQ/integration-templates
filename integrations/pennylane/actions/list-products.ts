import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per page. Defaults to 20.'),
    filter: z.string().optional().describe('JSON filter string for specific fields.'),
    sort: z.string().optional().describe('Sort field, optionally prefixed with - for descending order.')
});

const ProviderLedgerAccountSchema = z.object({
    id: z.number()
});

const ProviderProductSchema = z.object({
    id: z.number(),
    label: z.string(),
    description: z.string(),
    external_reference: z.string(),
    price_before_tax: z.string(),
    vat_rate: z.string(),
    price: z.string(),
    unit: z.string(),
    currency: z.string(),
    reference: z.string().nullable(),
    ledger_account: ProviderLedgerAccountSchema.nullable(),
    archived_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderListResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderProductSchema)
});

const ProductOutputSchema = z.object({
    id: z.number(),
    label: z.string(),
    description: z.string(),
    external_reference: z.string(),
    price_before_tax: z.string(),
    vat_rate: z.string(),
    price: z.string(),
    unit: z.string(),
    currency: z.string(),
    reference: z.string().optional(),
    ledger_account: ProviderLedgerAccountSchema.optional(),
    archived_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(ProductOutputSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List products.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['products:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/getproducts
        const response = await nango.get({
            endpoint: '/api/external/v2/products',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            items: parsed.items.map((item) => ({
                id: item.id,
                label: item.label,
                description: item.description,
                external_reference: item.external_reference,
                price_before_tax: item.price_before_tax,
                vat_rate: item.vat_rate,
                price: item.price,
                unit: item.unit,
                currency: item.currency,
                ...(item.reference != null && { reference: item.reference }),
                ...(item.ledger_account != null && { ledger_account: item.ledger_account }),
                ...(item.archived_at != null && { archived_at: item.archived_at }),
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            ...(parsed.next_cursor != null && { next_cursor: parsed.next_cursor }),
            has_more: parsed.has_more
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
