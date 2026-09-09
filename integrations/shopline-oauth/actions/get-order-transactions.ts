import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        order_id: z.string().describe('The order ID to query payment transactions for.'),
        transaction_id: z.string().optional().describe('Optional transaction ID to filter to a specific transaction.')
    })
    .describe('Input for querying payment transactions for an order.');

const TransactionSchema = z.object({}).passthrough();

const OutputSchema = z
    .object({
        transaction_list: z.array(TransactionSchema).describe('List of payment transactions for the order.')
    })
    .describe('Response containing the list of payment transactions for the specified order.');

/**
 * @tags: [read]
 * @tagReason: Queries payment transactions for an order from the provider.
 * @pitfalls: Orders marked as paid without a real payment gateway transaction will return an empty transaction_list.
 */
const action = createAction({
    description: 'Query payment transactions for an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/orders/transactions/query
            endpoint: '/admin/openapi/v20260601/transactions/query.json',
            data: {
                order_id: input.order_id,
                ...(input.transaction_id !== undefined && { transaction_id: input.transaction_id })
            },
            retries: 3
        });

        const body = z
            .object({
                transaction_list: z.array(z.object({}).passthrough())
            })
            .parse(response.data);

        return {
            transaction_list: body.transaction_list
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
