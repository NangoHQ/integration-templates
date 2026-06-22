import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination offset cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Maximum number of results per page. Default: 10, Max: 100.'),
    customer_id: z.string().optional().describe('Filter by customer ID. Example: "AzqOd0VMyUhHQZf4"'),
    subscription_id: z.string().optional().describe('Filter by subscription ID. Example: "AzZPdjVMyVrz9acf"'),
    type_is: z.enum(['payment', 'refund', 'payment_reversal']).optional().describe('Filter by transaction type.'),
    type_is_not: z.enum(['payment', 'refund', 'payment_reversal']).optional().describe('Exclude by transaction type.'),
    status_is: z.string().optional().describe('Filter by status.'),
    status_is_not: z.string().optional().describe('Exclude by status.'),
    date_gt: z.number().optional().describe('Filter by date greater than (Unix epoch seconds).'),
    date_lt: z.number().optional().describe('Filter by date less than (Unix epoch seconds).'),
    date_gte: z.number().optional().describe('Filter by date greater than or equal (Unix epoch seconds).'),
    date_lte: z.number().optional().describe('Filter by date less than or equal (Unix epoch seconds).'),
    updated_at_gt: z.number().optional().describe('Filter by updated_at greater than (Unix epoch seconds).'),
    updated_at_lt: z.number().optional().describe('Filter by updated_at less than (Unix epoch seconds).'),
    updated_at_gte: z.number().optional().describe('Filter by updated_at greater than or equal (Unix epoch seconds).'),
    updated_at_lte: z.number().optional().describe('Filter by updated_at less than or equal (Unix epoch seconds).')
});

const ProviderTransactionSchema = z
    .object({
        id: z.string(),
        customer_id: z.string().optional(),
        subscription_id: z.string().optional(),
        payment_method: z.string().optional(),
        gateway: z.string().optional(),
        type: z.string().optional(),
        date: z.number().optional(),
        amount: z.number().optional(),
        status: z.string().optional(),
        currency_code: z.string().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional(),
        resource_version: z.number().optional(),
        deleted: z.boolean().optional()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    list: z.array(z.object({ transaction: ProviderTransactionSchema })),
    next_offset: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(z.object({}).passthrough()),
    next_offset: z.string().optional()
});

const action = createAction({
    description: 'List transactions with optional filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            limit: input.limit ?? 10
        };

        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }

        if (input.customer_id !== undefined) {
            params['customer_id'] = input.customer_id;
        }

        if (input.subscription_id !== undefined) {
            params['subscription_id'] = input.subscription_id;
        }

        if (input.type_is !== undefined) {
            params['type[is]'] = input.type_is;
        }

        if (input.type_is_not !== undefined) {
            params['type[is_not]'] = input.type_is_not;
        }

        if (input.status_is !== undefined) {
            params['status[is]'] = input.status_is;
        }

        if (input.status_is_not !== undefined) {
            params['status[is_not]'] = input.status_is_not;
        }

        if (input.date_gt !== undefined) {
            params['date[after]'] = input.date_gt;
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
            params['updated_at[after]'] = input.updated_at_gt;
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

        // https://apidocs.chargebee.com/docs/api/transactions
        const response = await nango.get({
            endpoint: '/api/v2/transactions',
            params,
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            items: parsed.list.map((item) => item.transaction),
            ...(parsed.next_offset !== undefined && { next_offset: parsed.next_offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
