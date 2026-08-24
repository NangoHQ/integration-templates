import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        reviewer_name: z.string().describe('Customer name to display in the review request.'),
        reviewer_email: z.string().describe('Customer email address to send the review request to.'),
        shopify_product_id: z.string().optional().describe('Shopify product external ID. Provide this or product_handle.'),
        product_handle: z.string().optional().describe('Product handle slug. Provide this or shopify_product_id.'),
        fulfilled_at: z.string().describe('Order fulfillment date in dd/mm/yyyy format.'),
        quantity: z.number().int().positive().optional().describe('Quantity of the purchased product. Defaults to 1.'),
        processed_at: z
            .string()
            .optional()
            .describe('Date to send the review request in dd/mm/yyyy format. Defaults to fulfilled_at plus the store wait time.'),
        order_id: z.string().optional().describe('External order ID to associate with the request.'),
        order_number: z.string().optional().describe('Order number to associate with the request.')
    })
    .describe('Input for sending a manual review request email for an order.');

const ProviderResponseSchema = z.object({
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the manual review request was queued successfully.')
    })
    .describe('Result of sending a manual review request email.');

/**
 * @tags: [write, destructive]
 * @tagReason: Queues a real review request email to a customer. Once queued, the email cannot be unsent.
 * @pitfalls: Sends a real review request email; if processed_at is in the past the request is scheduled within 10 minutes. Dates must be dd/mm/yyyy and manually scheduled requests do not trigger Klaviyo events.
 */
const action = createAction({
    description: 'Send a manual review request email for an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.shopify_product_id && !input.product_handle) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either shopify_product_id or product_handle must be provided.'
            });
        }

        const response = await nango.post({
            // https://judge.me/help/en/articles/8409180-using-judge-me-api
            endpoint: '/api/orders/send_manual_review_request',
            data: {
                reviewer_name: input.reviewer_name,
                reviewer_email: input.reviewer_email,
                fulfilled_at: input.fulfilled_at,
                ...(input.shopify_product_id !== undefined && { shopify_product_id: input.shopify_product_id }),
                ...(input.product_handle !== undefined && { product_handle: input.product_handle }),
                ...(input.quantity !== undefined && { quantity: input.quantity }),
                ...(input.processed_at !== undefined && { processed_at: input.processed_at }),
                ...(input.order_id !== undefined && { order_id: input.order_id }),
                ...(input.order_number !== undefined && { order_number: input.order_number })
            },
            // No idempotency key on this endpoint and the side effect (queuing a real
            // email) cannot be undone, so retries are kept at the repo-enforced minimum
            // instead of the original 10 to limit duplicate-email risk on a timeout.
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        if (providerResponse.message !== 'success') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: `Unexpected response from provider: ${providerResponse.message}`
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
