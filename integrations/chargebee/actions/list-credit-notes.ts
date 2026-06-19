import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.string().optional().describe('Customer ID to filter by. Example: "AzqOd0VMyUhHQZf4"'),
    subscription_id: z.string().optional().describe('Subscription ID to filter by. Example: "AzqOd0VMyVsW3aOz"'),
    type: z.string().optional().describe('Type filter operator. Example: "adjustment" or "refundable"'),
    type_operator: z.enum(['is', 'is_not']).optional().describe('Operator for type filter. Example: "is" or "is_not"'),
    status: z.string().optional().describe('Status filter value. Example: "adjusted", "refunded", "refund_due", or "voided"'),
    status_operator: z.enum(['is', 'is_not']).optional().describe('Operator for status filter. Example: "is" or "is_not"'),
    date_gt: z.number().optional().describe('Filter credit notes with date greater than this Unix timestamp (seconds).'),
    date_lt: z.number().optional().describe('Filter credit notes with date less than this Unix timestamp (seconds).'),
    date_gte: z.number().optional().describe('Filter credit notes with date greater than or equal to this Unix timestamp (seconds).'),
    date_lte: z.number().optional().describe('Filter credit notes with date less than or equal to this Unix timestamp (seconds).'),
    updated_at_gt: z.number().optional().describe('Filter credit notes with updated_at greater than this Unix timestamp (seconds).'),
    updated_at_lt: z.number().optional().describe('Filter credit notes with updated_at less than this Unix timestamp (seconds).'),
    updated_at_gte: z.number().optional().describe('Filter credit notes with updated_at greater than or equal to this Unix timestamp (seconds).'),
    updated_at_lte: z.number().optional().describe('Filter credit notes with updated_at less than or equal to this Unix timestamp (seconds).'),
    cursor: z.string().optional().describe('Pagination offset cursor from the previous response. Omit for the first page.')
});

const CreditNoteSchema = z.object({
    id: z.string(),
    customer_id: z.string().optional(),
    subscription_id: z.string().optional().nullable(),
    reference_invoice_id: z.string().optional().nullable(),
    type: z.string().optional(),
    status: z.string().optional(),
    date: z.number().optional(),
    total: z.number().optional(),
    amount_allocated: z.number().optional(),
    amount_refunded: z.number().optional(),
    amount_available: z.number().optional(),
    updated_at: z.number().optional(),
    currency_code: z.string().optional(),
    reason_code: z.string().optional().nullable()
});

const ProviderListSchema = z.object({
    list: z.array(z.object({ credit_note: CreditNoteSchema })),
    next_offset: z.string().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(CreditNoteSchema),
    next_offset: z.string().optional().describe('Pagination cursor for the next page. Omit if there are no more pages.')
});

const action = createAction({
    description: 'List credit notes with optional filters',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            limit: 100
        };

        if (input.customer_id !== undefined) {
            params['customer_id'] = input.customer_id;
        }
        if (input.subscription_id !== undefined) {
            params['subscription_id'] = input.subscription_id;
        }
        if (input.type !== undefined && input.type_operator !== undefined) {
            params[`type[${input.type_operator}]`] = input.type;
        }
        if (input.status !== undefined && input.status_operator !== undefined) {
            params[`status[${input.status_operator}]`] = input.status;
        }
        if (input.date_gt !== undefined) {
            params['date[gt]'] = input.date_gt;
        }
        if (input.date_lt !== undefined) {
            params['date[lt]'] = input.date_lt;
        }
        if (input.date_gte !== undefined) {
            params['date[gte]'] = input.date_gte;
        }
        if (input.date_lte !== undefined) {
            params['date[lte]'] = input.date_lte;
        }
        if (input.updated_at_gt !== undefined) {
            params['updated_at[gt]'] = input.updated_at_gt;
        }
        if (input.updated_at_lt !== undefined) {
            params['updated_at[lt]'] = input.updated_at_lt;
        }
        if (input.updated_at_gte !== undefined) {
            params['updated_at[gte]'] = input.updated_at_gte;
        }
        if (input.updated_at_lte !== undefined) {
            params['updated_at[lte]'] = input.updated_at_lte;
        }
        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }

        // https://apidocs.chargebee.com/docs/api/credit_notes
        const response = await nango.get({
            endpoint: '/api/v2/credit_notes',
            params,
            retries: 3
        });

        const providerData = ProviderListSchema.parse(response.data);

        return {
            items: providerData.list.map((item) => item.credit_note),
            ...(providerData.next_offset != null ? { next_offset: providerData.next_offset } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
