import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    fulfillment_order_line_item_id: z.string().describe('The ID of the rejected line item. Example: "gid://shopify/FulfillmentOrderLineItem/123"'),
    message: z.string().optional().describe('The rejection message of the line item.')
});

const InputSchema = z.object({
    fulfillment_order_id: z.string().describe('The ID of the fulfillment order. Example: "gid://shopify/FulfillmentOrder/1046000786"'),
    line_items: z
        .array(LineItemInputSchema)
        .optional()
        .describe('An optional array of line item rejection details. If none are provided, all line items will be assumed to be unfulfillable.'),
    message: z.string().optional().describe('An optional reason for rejecting the fulfillment request.'),
    reason: z
        .enum([
            'INCORRECT_ADDRESS',
            'INCORRECT_PRODUCT_INFO',
            'INELIGIBLE_PRODUCT',
            'INTERNATIONAL_SHIPPING_UNAVAILABLE',
            'INVALID_CONTACT_INFORMATION',
            'INVALID_SKU',
            'INVENTORY_OUT_OF_STOCK',
            'MERCHANT_BLOCKED_OR_SUSPENDED',
            'MISSING_CUSTOMS_INFO',
            'ORDER_TOO_LARGE',
            'OTHER',
            'PACKAGE_PREFERENCE_NOT_SET',
            'PAYMENT_DECLINED',
            'UNDELIVERABLE_DESTINATION'
        ])
        .optional()
        .describe('The reason for the fulfillment order rejection.')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const FulfillmentOrderSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    request_status: z.string().optional()
});

const OutputSchema = z.object({
    fulfillment_order: FulfillmentOrderSchema.optional(),
    user_errors: z.array(UserErrorSchema)
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            fulfillmentOrderRejectFulfillmentRequest: z
                .object({
                    fulfillmentOrder: z.unknown().optional(),
                    userErrors: z.unknown().optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Reject a fulfillment request on a Shopify fulfillment order.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/reject-fulfillment-request',
        group: 'Fulfillment Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_assigned_fulfillment_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const lineItems = input.line_items?.map((item) => ({
            fulfillmentOrderLineItemId: item.fulfillment_order_line_item_id,
            ...(item.message !== undefined && { message: item.message })
        }));

        const variables: Record<string, unknown> = {
            id: input.fulfillment_order_id,
            ...(lineItems !== undefined && { lineItems }),
            ...(input.message !== undefined && { message: input.message }),
            ...(input.reason !== undefined && { reason: input.reason })
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-07/mutations/fulfillmentOrderRejectFulfillmentRequest
        const response = await nango.post({
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: `
                    mutation fulfillmentOrderRejectFulfillmentRequest($id: ID!, $lineItems: [IncomingRequestLineItemInput!], $message: String, $reason: FulfillmentOrderRejectionReason) {
                        fulfillmentOrderRejectFulfillmentRequest(id: $id, lineItems: $lineItems, message: $message, reason: $reason) {
                            fulfillmentOrder {
                                id
                                status
                                requestStatus
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables
            },
            retries: 1
        });

        const payload = response.data;
        if (!payload || typeof payload !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify.'
            });
        }

        const parsedResponse = GraphQLResponseSchema.safeParse(payload);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response structure from Shopify.'
            });
        }

        const result = parsedResponse.data.data?.fulfillmentOrderRejectFulfillmentRequest;
        if (!result) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing fulfillmentOrderRejectFulfillmentRequest in response.'
            });
        }

        const rawUserErrors = result.userErrors;
        const userErrors = z.array(UserErrorSchema).parse(rawUserErrors ?? []);

        if (userErrors.length > 0) {
            return {
                user_errors: userErrors
            };
        }

        const rawFulfillmentOrder = result.fulfillmentOrder;
        if (!rawFulfillmentOrder || typeof rawFulfillmentOrder !== 'object') {
            return {
                user_errors: userErrors
            };
        }

        const parsedFulfillmentOrder = FulfillmentOrderSchema.parse(rawFulfillmentOrder);

        return {
            fulfillment_order: {
                id: parsedFulfillmentOrder.id,
                ...(parsedFulfillmentOrder.status !== undefined && { status: parsedFulfillmentOrder.status }),
                ...(parsedFulfillmentOrder.request_status !== undefined && { request_status: parsedFulfillmentOrder.request_status })
            },
            user_errors: userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
