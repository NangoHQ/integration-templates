import { z } from 'zod';
import { createAction } from 'nango';

const ResourceLinkSchema = z
    .object({
        id: z.number(),
        url: z.string()
    })
    .passthrough();

const UrlLinkSchema = z
    .object({
        url: z.string()
    })
    .passthrough();

const TransactionSchema = z
    .object({
        id: z.number(),
        amount: z.string(),
        archived_at: z.string().nullable().optional(),
        attachment_required: z.boolean(),
        bank_account: ResourceLinkSchema.nullable().optional(),
        categories: z.array(z.unknown()),
        created_at: z.string(),
        currency: z.string(),
        currency_amount: z.string(),
        currency_fee: z.string().nullable().optional(),
        customer: z.unknown().nullable().optional(),
        date: z.string(),
        fee: z.string().nullable().optional(),
        interbank_code: z.string().nullable().optional(),
        journal: ResourceLinkSchema.nullable().optional(),
        label: z.string(),
        matched_invoices: UrlLinkSchema.nullable().optional(),
        outstanding_balance: z.string(),
        pro_account_expense: z.unknown().nullable().optional(),
        supplier: ResourceLinkSchema.nullable().optional(),
        updated_at: z.string()
    })
    .passthrough();

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items to return per page. Must be between 1 and 100. Defaults to 20 if omitted.')
});

const OutputSchema = z.object({
    items: z.array(TransactionSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(z.unknown()),
    has_more: z.boolean(),
    next_cursor: z.string().nullable().optional()
});

const action = createAction({
    description: 'List bank transactions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/gettransactions
            endpoint: '/api/external/v2/transactions',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const items = providerResponse.items.map((item) => TransactionSchema.parse(item));

        return {
            items,
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
