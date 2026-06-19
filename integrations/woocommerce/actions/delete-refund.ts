import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.number().describe('The order ID. Example: 18'),
    refund_id: z.number().describe('The refund ID. Example: 23')
});

const ProviderRefundSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    amount: z.string().optional(),
    reason: z.string().optional(),
    refunded_by: z.number().optional(),
    refunded_payment: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    order_id: z.number(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a refund in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-a-refund
        const response = await nango.delete({
            endpoint: `/wp-json/wc/v3/orders/${encodeURIComponent(input.order_id)}/refunds/${encodeURIComponent(input.refund_id)}`,
            params: {
                force: 'true'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Refund not found',
                order_id: input.order_id,
                refund_id: input.refund_id
            });
        }

        const providerRefund = ProviderRefundSchema.parse(response.data);

        return {
            id: providerRefund.id,
            order_id: input.order_id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
