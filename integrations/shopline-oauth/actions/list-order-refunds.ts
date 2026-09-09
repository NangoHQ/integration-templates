import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        order_id: z.string().describe('The order ID to list refunds for. Example: "21076844537675933358365835"')
    })
    .describe('Input for listing refunds associated with an order');

const RefundSchema = z
    .object({
        id: z.string().describe('The refund ID'),
        order_id: z.string().describe('The associated order ID')
    })
    .passthrough();

const OutputSchema = z
    .object({
        refunds: z.array(RefundSchema).describe('List of refunds associated with the order')
    })
    .describe('List of refunds for the specified order');

/**
 * @tags: [read]
 * @tagReason: Lists existing refund records for a given order from the provider.
 * @pitfalls: Cancelling an order auto-generates a zero-amount refund record as a side effect, so the list may contain refunds not explicitly requested.
 */
const action = createAction({
    description: 'List refunds associated with an order',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/orders/refunds/list-refunds
            endpoint: `admin/openapi/v20260601/orders/${encodeURIComponent(input.order_id)}/refunds.json`,
            retries: 3
        });

        const parsed = z.object({ refunds: z.array(z.unknown()) }).parse(response.data);

        return {
            refunds: parsed.refunds.map((refund) => RefundSchema.parse(refund))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
