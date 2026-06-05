import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    orderId: z.string().describe('Shopify order GID. Example: "gid://shopify/Order/1234567890"')
});

const ProviderMoneyV2Schema = z.object({
    amount: z.string()
});

const ProviderMoneyBagSchema = z.object({
    shopMoney: ProviderMoneyV2Schema
});

const ProviderTransactionSchema = z.object({
    kind: z.string(),
    status: z.string(),
    amountSet: ProviderMoneyBagSchema,
    gateway: z.string().nullable(),
    processedAt: z.string().nullable()
});

const TransactionSchema = z.object({
    kind: z.string(),
    status: z.string(),
    amount: z.string(),
    gateway: z.string().optional(),
    processedAt: z.string().optional()
});

const OutputSchema = z.object({
    transactions: z.array(TransactionSchema)
});

const action = createAction({
    description: 'List payment transactions for a Shopify order.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-order-transactions',
        group: 'Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://shopify.dev/docs/api/admin-graphql/latest/objects/Order#field-Order.fields.transactions
        const response = await nango.post({
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    query getOrderTransactions($id: ID!) {
                        order(id: $id) {
                            transactions {
                                kind
                                status
                                amountSet {
                                    shopMoney {
                                        amount
                                    }
                                }
                                gateway
                                processedAt
                            }
                        }
                    }
                `,
                variables: {
                    id: input.orderId
                }
            },
            retries: 3
        });

        const body = z
            .object({
                data: z
                    .object({
                        order: z
                            .object({
                                transactions: z.array(z.unknown()).optional()
                            })
                            .nullable()
                            .optional()
                    })
                    .nullable()
                    .optional(),
                errors: z.array(z.object({ message: z.string() })).optional()
            })
            .parse(response.data);

        if (body.errors != null && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: body.errors.map((e) => e.message).join(', ')
            });
        }

        const order = body.data?.order;

        if (!order) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Order not found for ID: ${input.orderId}`
            });
        }

        const rawTransactions = order.transactions || [];

        const transactions = rawTransactions.map((tx: unknown) => {
            const parsed = ProviderTransactionSchema.parse(tx);
            return {
                kind: parsed.kind,
                status: parsed.status,
                amount: parsed.amountSet.shopMoney.amount,
                ...(parsed.gateway != null && { gateway: parsed.gateway }),
                ...(parsed.processedAt != null && { processedAt: parsed.processedAt })
            };
        });

        return {
            transactions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
