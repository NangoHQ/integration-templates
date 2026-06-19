import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    orderId: z.number().describe('Order ID to list refunds for. Example: 18'),
    page: z.number().optional().describe('Page number for pagination. Starts at 1.'),
    perPage: z.number().optional().describe('Number of refunds per page. Maximum 100.')
});

const RefundLineItemSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    product_id: z.number().optional(),
    variation_id: z.number().optional(),
    quantity: z.number().optional(),
    subtotal: z.string().optional(),
    subtotal_tax: z.string().optional(),
    total: z.string().optional(),
    total_tax: z.string().optional(),
    sku: z.string().optional(),
    price: z.number().optional()
});

const RefundSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    amount: z.string().optional(),
    reason: z.string().optional(),
    refunded_by: z.number().optional(),
    refunded_payment: z.boolean().optional(),
    meta_data: z.array(z.record(z.string(), z.unknown())).optional(),
    line_items: z.array(RefundLineItemSchema).optional(),
    api_refund: z.boolean().optional()
});

const ListOutputSchema = z.object({
    refunds: z.array(RefundSchema),
    totalPages: z.number().optional(),
    totalItems: z.number().optional(),
    currentPage: z.number().optional()
});

const action = createAction({
    description: 'List refunds from WooCommerce',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.perPage !== undefined) {
            params['per_page'] = input.perPage;
        }

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-order-refunds
        const response = await nango.get({
            endpoint: `/wp-json/wc/v3/orders/${encodeURIComponent(input.orderId)}/refunds`,
            params,
            retries: 3
        });

        const rawRefunds = response.data;
        if (!Array.isArray(rawRefunds)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected array of refunds from WooCommerce API'
            });
        }

        const refunds = rawRefunds.map((rawRefund: unknown) => RefundSchema.parse(rawRefund));

        return {
            refunds,
            totalPages: response.headers['x-wp-totalpages'] ? parseInt(response.headers['x-wp-totalpages'], 10) : undefined,
            totalItems: response.headers['x-wp-total'] ? parseInt(response.headers['x-wp-total'], 10) : undefined,
            currentPage: input.page ?? 1
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
