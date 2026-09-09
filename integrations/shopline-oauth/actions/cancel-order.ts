import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        order_id: z.string().describe('The unique identifier of the order to cancel.'),
        processed_at: z.string().optional().describe('ISO 8601 timestamp of when the order was processed.'),
        refund_type: z.enum(['OriginalPayment Refund', 'Manual']).optional().describe('Refund method to use for the cancellation.'),
        restock: z.boolean().optional().describe('Whether to restock the inventory for cancelled items.'),
        amount: z.string().optional().describe('Refund amount to issue.'),
        cancel_reason: z.string().optional().describe('Reason for cancelling the order.'),
        currency: z.string().optional().describe('Currency code for the refund amount.'),
        email: z.boolean().optional().describe('Whether to send a cancellation notification email to the customer.')
    })
    .describe('Input parameters for cancelling a SHOPLINE order.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the cancelled order.'),
        status: z.string().optional().describe('The current status of the order after cancellation.'),
        cancelled_at: z.string().optional().describe('ISO 8601 timestamp when the order was cancelled.'),
        cancel_reason: z.string().optional().describe('The reason recorded for the cancellation.')
    })
    .describe('Result of cancelling a SHOPLINE order.');

const ProviderResponseSchema = z.object({
    order: z.object({
        id: z.string(),
        status: z.string().nullable().optional(),
        cancelled_at: z.string().nullable().optional(),
        cancel_reason: z.string().nullable().optional()
    })
});

/**
 * @tags: [write, destructive]
 * @tagReason: Cancelling an order permanently updates its status and generates financial side effects that cannot be fully reversed.
 * @pitfalls: Cancelling an order automatically creates a zero-amount refund record as a side effect even when no refund amount is specified, and calling it again on an already-cancelled order returns a 422 error.
 */
const action = createAction({
    description: 'Cancel an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.processed_at !== undefined) {
            body['processed_at'] = input.processed_at;
        }
        if (input.refund_type !== undefined) {
            body['refund_type'] = input.refund_type;
        }
        if (input.restock !== undefined) {
            body['restock'] = input.restock;
        }
        if (input.amount !== undefined) {
            body['amount'] = input.amount;
        }
        if (input.cancel_reason !== undefined) {
            body['cancel_reason'] = input.cancel_reason;
        }
        if (input.currency !== undefined) {
            body['currency'] = input.currency;
        }
        if (input.email !== undefined) {
            body['email'] = input.email;
        }

        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/orders/order/cancel-order
            endpoint: `/admin/openapi/v20260601/orders/${encodeURIComponent(input.order_id)}/cancel.json`,
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const order = providerResponse.order;

        return {
            id: order.id,
            ...(order.status != null && { status: order.status }),
            ...(order.cancelled_at != null && { cancelled_at: order.cancelled_at }),
            ...(order.cancel_reason != null && { cancel_reason: order.cancel_reason })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
