import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Customer invoice ID. Example: 25461646082048'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20.')
});

const ProviderPaymentSchema = z.object({
    id: z.number(),
    label: z.string(),
    currency: z.string().nullable(),
    currency_amount: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderPaymentSchema)
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            label: z.string(),
            currency: z.string().optional(),
            currency_amount: z.string(),
            status: z.string(),
            created_at: z.string(),
            updated_at: z.string()
        })
    ),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List payments for a customer invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomerinvoicepayments
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(input.id)}/payments`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const body = ProviderResponseSchema.parse(response.data);

        return {
            items: body.items.map((item) => ({
                id: item.id,
                label: item.label,
                ...(item.currency != null && { currency: item.currency }),
                currency_amount: item.currency_amount,
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            has_more: body.has_more,
            ...(body.next_cursor != null && { next_cursor: body.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
