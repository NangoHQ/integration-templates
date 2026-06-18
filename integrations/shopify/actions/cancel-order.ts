import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    orderId: z.string().describe('The Shopify order ID or GID. Example: "gid://shopify/Order/1234567890" or "1234567890"'),
    reason: z.string().describe('The cancellation reason. Example: "CUSTOMER"'),
    refund: z.boolean().optional().describe('Whether to refund the original payment methods.'),
    restock: z.boolean().optional().describe('Whether to restock the inventory committed to the order.')
});

const JobSchema = z.object({
    id: z.string(),
    done: z.boolean()
});

const OrderCancelUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    job: JobSchema.optional(),
    orderCancelUserErrors: z.array(OrderCancelUserErrorSchema).optional(),
    userErrors: z.array(UserErrorSchema).optional()
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            orderCancel: z
                .object({
                    job: JobSchema.nullable().optional(),
                    orderCancelUserErrors: z.array(OrderCancelUserErrorSchema).optional(),
                    userErrors: z.array(UserErrorSchema).optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'Cancel a Shopify order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orderId = input.orderId.startsWith('gid://') ? input.orderId : `gid://shopify/Order/${input.orderId}`;
        const reason = input.reason;
        const restock = input.restock ?? false;

        const variables: Record<string, unknown> = {
            orderId,
            reason,
            restock
        };

        if (input.refund !== undefined) {
            variables['refundMethod'] = {
                originalPaymentMethodsRefund: input.refund
            };
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/orderCancel
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: `
                    mutation OrderCancel($orderId: ID!, $reason: OrderCancelReason!, $restock: Boolean!, $refundMethod: OrderCancelRefundMethodInput) {
                        orderCancel(orderId: $orderId, reason: $reason, restock: $restock, refundMethod: $refundMethod) {
                            job {
                                id
                                done
                            }
                            orderCancelUserErrors {
                                field
                                message
                                code
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
            retries: 10
        });

        const body = ProviderResponseSchema.parse(response.data);

        if (body.errors != null && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: body.errors.map((error) => error.message).join(', ')
            });
        }

        const result = body.data?.orderCancel;
        if (result == null) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'orderCancel result missing in response'
            });
        }

        return {
            ...(result.job != null && { job: result.job }),
            ...(result.orderCancelUserErrors != null && result.orderCancelUserErrors.length > 0 && { orderCancelUserErrors: result.orderCancelUserErrors }),
            ...(result.userErrors != null && result.userErrors.length > 0 && { userErrors: result.userErrors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
