import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    orderId: z.string().describe('The ID of the order to close. Example: "gid://shopify/Order/1234567890"')
});

const OrderSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    closed: z.boolean().optional(),
    closedAt: z.string().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    order: OrderSchema.nullable().optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Close a Shopify order to prevent further changes.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders', 'write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const match = input.orderId.match(/^gid:\/\/shopify\/Order\/(\d+)$/);
        if (!match) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'orderId must be a valid Shopify order GID (e.g., gid://shopify/Order/1234567890)'
            });
        }

        const numericOrderId = match[1];
        if (!numericOrderId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Could not extract numeric order ID from GID'
            });
        }

        // https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/orderClose
        const closeResponse = await nango.post({
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    mutation orderClose($input: OrderCloseInput!) {
                        orderClose(input: $input) {
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        id: input.orderId
                    }
                }
            },
            retries: 1
        });

        const closeBody = closeResponse.data;

        const closeResultSchema = z.object({
            data: z
                .object({
                    orderClose: z.object({
                        userErrors: z.array(UserErrorSchema)
                    })
                })
                .optional(),
            errors: z.array(z.object({ message: z.string() }).passthrough()).optional()
        });

        const closeParsed = closeResultSchema.parse(closeBody);

        if (closeParsed.errors && closeParsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: closeParsed.errors.map((e) => e.message).join('; ')
            });
        }

        const orderClose = closeParsed.data?.orderClose;
        if (!orderClose) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify'
            });
        }

        if (orderClose.userErrors.length > 0) {
            return {
                order: undefined,
                userErrors: orderClose.userErrors
            };
        }

        // https://shopify.dev/docs/api/admin-rest/2025-01/resources/order#post-orders-order-id-close
        const orderResponse = await nango.post({
            endpoint: `/admin/api/2025-01/orders/${encodeURIComponent(numericOrderId)}/close.json`,
            retries: 1
        });

        const orderBody = orderResponse.data;

        const restOrderSchema = z.object({
            order: z.object({
                id: z.number(),
                name: z.string().optional(),
                closed_at: z.string().nullable().optional()
            })
        });

        const orderParsed = restOrderSchema.parse(orderBody);

        return {
            order: {
                id: `gid://shopify/Order/${orderParsed.order.id}`,
                name: orderParsed.order.name,
                closed: orderParsed.order.closed_at != null,
                closedAt: orderParsed.order.closed_at ?? undefined
            },
            userErrors: []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
