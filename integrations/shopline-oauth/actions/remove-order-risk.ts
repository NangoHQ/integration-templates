import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        order_id: z.string().describe('The unique identifier of the order containing the risk to remove.'),
        risk_id: z.string().describe('The unique identifier of the fraud risk assessment to remove.')
    })
    .describe('Input to remove a fraud risk assessment from an order.');

const ProviderResponseSchema = z.object({});

const OutputSchema = z.object({}).describe('Empty success response confirming the risk was removed.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a fraud risk assessment from an order.
 */
const action = createAction({
    description: 'Remove a fraud risk assessment from an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/order/order-management/remove-the-specify-of-the-order-risk-fraud
            endpoint: `/admin/openapi/v20260601/orders/v2/${encodeURIComponent(input.order_id)}/risks/${encodeURIComponent(input.risk_id)}.json`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data ?? {});
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
