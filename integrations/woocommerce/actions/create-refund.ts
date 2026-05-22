import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.number().int().positive().describe('Order ID. Example: 18'),
    amount: z.string().describe('Refund amount. Example: "10.00"'),
    reason: z.string().optional().describe('Reason for refund.'),
    api_refund: z.boolean().optional().describe('Use payment gateway API to generate refund. Default true.'),
    api_restock: z.boolean().optional().describe('Restock selected line items. Default true.'),
    line_items: z
        .array(
            z.object({
                id: z.number().int(),
                refund_total: z.number().optional(),
                quantity: z.number().int().optional(),
                refund_tax: z
                    .array(
                        z.object({
                            id: z.number().int(),
                            refund_total: z.number().optional()
                        })
                    )
                    .optional()
            })
        )
        .optional()
        .describe('Line items to refund.')
});

const MetaDataSchema = z.object({
    id: z.number().int().optional(),
    key: z.string().optional(),
    value: z.unknown().optional()
});

const RefundLineItemSchema = z.object({
    id: z.number().int(),
    name: z.string().optional(),
    product_id: z.number().int().optional(),
    variation_id: z.number().int().optional(),
    quantity: z.number().optional(),
    tax_class: z.string().optional(),
    subtotal: z.string().optional(),
    subtotal_tax: z.string().optional(),
    total: z.string().optional(),
    total_tax: z.string().optional(),
    taxes: z.array(z.unknown()).optional(),
    meta_data: z.array(MetaDataSchema).optional(),
    sku: z.string().optional(),
    price: z.number().optional(),
    refund_total: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number().int(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    amount: z.string(),
    reason: z.string().optional(),
    refunded_by: z.number().int().optional(),
    refunded_payment: z.boolean().optional(),
    meta_data: z.array(MetaDataSchema).optional(),
    line_items: z.array(RefundLineItemSchema).optional(),
    tax_lines: z.array(z.unknown()).optional(),
    shipping_lines: z.array(z.unknown()).optional(),
    fee_lines: z.array(z.unknown()).optional(),
    _links: z.record(z.string(), z.array(z.object({ href: z.string() }))).optional()
});

const action = createAction({
    description: 'Create a refund in WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-refund',
        group: 'Refunds'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            amount: input.amount
        };

        if (input.reason !== undefined) {
            payload['reason'] = input.reason;
        }

        if (input.api_refund !== undefined) {
            payload['api_refund'] = input.api_refund;
        }

        if (input.api_restock !== undefined) {
            payload['api_restock'] = input.api_restock;
        }

        if (input.line_items !== undefined) {
            payload['line_items'] = input.line_items;
        }

        const response = await nango.post({
            // https://developer.woocommerce.com/docs/apis/rest-api/v3/order-refunds/
            endpoint: `/wp-json/wc/v3/orders/${encodeURIComponent(String(input.order_id))}/refunds`,
            data: payload,
            // Refund creation is non-idempotent; do not retry on failure.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerRefund = OutputSchema.parse(response.data);
        return providerRefund;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
