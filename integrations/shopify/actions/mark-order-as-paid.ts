import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    orderId: z.string().describe('Shopify order ID. Example: "gid://shopify/Order/148977776" or "148977776"')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()),
    message: z.string()
});

const MoneySchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const OrderSchema = z.object({
    id: z.string(),
    name: z.string(),
    canMarkAsPaid: z.boolean(),
    displayFinancialStatus: z.string(),
    totalPrice: z.string(),
    totalOutstandingSet: z
        .object({
            shopMoney: MoneySchema.optional()
        })
        .optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            orderMarkAsPaid: z
                .object({
                    userErrors: z.array(UserErrorSchema),
                    order: OrderSchema.nullable().optional()
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                path: z.array(z.union([z.string(), z.number()])).optional(),
                extensions: z
                    .object({
                        code: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    order: OrderSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Mark a Shopify order as fully paid.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orderId = input.orderId.startsWith('gid://shopify/Order/') ? input.orderId : `gid://shopify/Order/${input.orderId}`;

        const query = `
            mutation orderMarkAsPaid($input: OrderMarkAsPaidInput!) {
                orderMarkAsPaid(input: $input) {
                    userErrors {
                        field
                        message
                    }
                    order {
                        id
                        name
                        canMarkAsPaid
                        displayFinancialStatus
                        totalPrice
                        totalOutstandingSet {
                            shopMoney {
                                amount
                                currencyCode
                            }
                        }
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/2025-01/mutations/orderMarkAsPaid
        const response = await nango.post({
            endpoint: 'admin/api/2025-01/graphql.json',
            data: {
                query,
                variables: {
                    input: {
                        id: orderId
                    }
                }
            },
            retries: 1
        });

        const payload = GraphQLResponseSchema.parse(response.data);

        const errors = payload.errors;
        const hasCriticalErrors =
            errors &&
            errors.length > 0 &&
            errors.some((error) => {
                const code = error.extensions?.code;
                const path = Array.isArray(error.path) ? error.path : [];
                const isOrderAccessDenied = code === 'ACCESS_DENIED' && path.includes('order');
                return !isOrderAccessDenied;
            });

        if (hasCriticalErrors) {
            const firstError = errors[0];
            if (!firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: 'Unknown GraphQL error.',
                    errors: errors
                });
            }
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError.message,
                errors: errors
            });
        }

        const result = payload.data?.orderMarkAsPaid;
        if (!result) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Missing orderMarkAsPaid response from Shopify GraphQL API.'
            });
        }

        return {
            ...(result.order != null && { order: result.order }),
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
