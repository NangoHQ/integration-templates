import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fulfillmentOrderId: z.string().describe('The ID of the fulfillment order to place on hold. Example: "gid://shopify/FulfillmentOrder/1046001480"'),
    hold: z.object({
        reason: z
            .enum([
                'AWAITING_PAYMENT',
                'AWAITING_RETURN_ITEMS',
                'HIGH_RISK_OF_FRAUD',
                'INCORRECT_ADDRESS',
                'INVENTORY_OUT_OF_STOCK',
                'ONLINE_STORE_POST_PURCHASE_CROSS_SELL',
                'OTHER',
                'UNKNOWN_DELIVERY_DATE'
            ])
            .describe('The reason for the fulfillment hold.'),
        notifyMerchant: z.boolean().optional().describe('Whether the merchant receives a notification about the fulfillment hold. Defaults to false.'),
        reasonNotes: z.string().optional().describe('Additional information about the fulfillment hold reason.'),
        handle: z.string().optional().describe('A unique identifier for the hold applied by the app.')
    })
});

const FulfillmentHoldSchema = z.object({
    reason: z.string(),
    reasonNotes: z.string().nullable().optional()
});

const FulfillmentOrderSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    requestStatus: z.string().optional(),
    fulfillmentHolds: z.array(FulfillmentHoldSchema).optional()
});

const UserErrorSchema = z.object({
    code: z.string().optional(),
    field: z.array(z.string()).nullable().optional(),
    message: z.string()
});

const OutputSchema = z.object({
    fulfillmentOrder: FulfillmentOrderSchema.optional(),
    remainingFulfillmentOrder: z.object({ id: z.string() }).optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Place a hold on a Shopify fulfillment order to pause fulfillment.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_merchant_managed_fulfillment_orders', 'write_third_party_fulfillment_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation FulfillmentOrderHold($fulfillmentHold: FulfillmentOrderHoldInput!, $id: ID!) {
                fulfillmentOrderHold(fulfillmentHold: $fulfillmentHold, id: $id) {
                    fulfillmentOrder {
                        id
                        status
                        requestStatus
                        fulfillmentHolds {
                            reason
                            reasonNotes
                        }
                    }
                    remainingFulfillmentOrder {
                        id
                    }
                    userErrors {
                        code
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            id: input.fulfillmentOrderId,
            fulfillmentHold: {
                reason: input.hold.reason,
                ...(input.hold.notifyMerchant !== undefined && { notifyMerchant: input.hold.notifyMerchant }),
                ...(input.hold.reasonNotes !== undefined && { reasonNotes: input.hold.reasonNotes }),
                ...(input.hold.handle !== undefined && { handle: input.hold.handle })
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/fulfillmentOrderHold
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 10
        });

        const responseBody = z
            .object({
                data: z.object({
                    fulfillmentOrderHold: z.object({
                        fulfillmentOrder: FulfillmentOrderSchema.nullable().optional(),
                        remainingFulfillmentOrder: z.object({ id: z.string() }).nullable().optional(),
                        userErrors: z.array(UserErrorSchema)
                    })
                })
            })
            .parse(response.data);

        const result = responseBody.data.fulfillmentOrderHold;

        return {
            ...(result.fulfillmentOrder != null && { fulfillmentOrder: result.fulfillmentOrder }),
            ...(result.remainingFulfillmentOrder != null && { remainingFulfillmentOrder: result.remainingFulfillmentOrder }),
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
