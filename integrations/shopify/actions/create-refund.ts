import { createAction } from 'nango';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const RefundLineItemInputSchema = z.object({
    lineItemId: z.string(),
    quantity: z.number().int(),
    restockType: z.string().optional(),
    locationId: z.string().optional()
});

const ShippingRefundInputSchema = z.object({
    amount: z.string().optional(),
    fullRefund: z.boolean().optional()
});

const OrderTransactionInputSchema = z.object({
    orderId: z.string(),
    parentId: z.string().optional(),
    kind: z.string(),
    gateway: z.string(),
    amount: z.string()
});

const RefundDutyInputSchema = z.object({
    dutyId: z.string(),
    refundType: z.string().optional()
});

const InputSchema = z.object({
    orderId: z.string(),
    refundLineItems: z.array(RefundLineItemInputSchema).optional(),
    shipping: ShippingRefundInputSchema.optional(),
    transactions: z.array(OrderTransactionInputSchema).optional(),
    duties: z.array(RefundDutyInputSchema).optional(),
    note: z.string().optional(),
    notify: z.boolean().optional(),
    allowOverRefunding: z.boolean().optional(),
    currency: z.string().optional(),
    discrepancyReason: z.string().optional(),
    processedAt: z.string().optional(),
    idempotencyKey: z.string().optional()
});

const OutputSchema = z.object({
    refund: z
        .object({
            id: z.string().optional(),
            note: z.string().optional(),
            createdAt: z.string().optional(),
            processedAt: z.string().optional(),
            totalRefundedSet: z
                .object({
                    presentmentMoney: z
                        .object({
                            amount: z.string().optional(),
                            currencyCode: z.string().optional()
                        })
                        .optional(),
                    shopMoney: z
                        .object({
                            amount: z.string().optional(),
                            currencyCode: z.string().optional()
                        })
                        .optional()
                })
                .optional()
        })
        .optional(),
    userErrors: z
        .array(
            z.object({
                field: z.array(z.string()).optional(),
                message: z.string().optional()
            })
        )
        .optional()
});

const ResponseSchema = z.object({
    data: z
        .object({
            refundCreate: z
                .object({
                    refund: z
                        .object({
                            id: z.string().optional(),
                            note: z.string().optional(),
                            createdAt: z.string().optional(),
                            processedAt: z.string().optional(),
                            totalRefundedSet: z
                                .object({
                                    presentmentMoney: z
                                        .object({
                                            amount: z.string().optional(),
                                            currencyCode: z.string().optional()
                                        })
                                        .optional(),
                                    shopMoney: z
                                        .object({
                                            amount: z.string().optional(),
                                            currencyCode: z.string().optional()
                                        })
                                        .optional()
                                })
                                .optional()
                        })
                        .nullable()
                        .optional(),
                    userErrors: z
                        .array(
                            z.object({
                                field: z.array(z.string()).optional(),
                                message: z.string().optional()
                            })
                        )
                        .optional()
                })
                .optional()
        })
        .optional()
});

export default createAction({
    description: 'Create a refund for a Shopify order',
    version: '0.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders', 'write_orders'],
    exec: async (nango, input) => {
        const idempotencyKey = input.idempotencyKey ?? randomUUID();

        const variables: Record<string, unknown> = {
            input: {
                orderId: input.orderId,
                ...(input.refundLineItems !== undefined ? { refundLineItems: input.refundLineItems } : {}),
                ...(input.shipping !== undefined ? { shipping: input.shipping } : {}),
                ...(input.transactions !== undefined ? { transactions: input.transactions } : {}),
                ...(input.duties !== undefined ? { refundDuties: input.duties } : {}),
                ...(input.note !== undefined ? { note: input.note } : {}),
                ...(input.notify !== undefined ? { notify: input.notify } : {}),
                ...(input.allowOverRefunding !== undefined ? { allowOverRefunding: input.allowOverRefunding } : {}),
                ...(input.currency !== undefined ? { currency: input.currency } : {}),
                ...(input.discrepancyReason !== undefined ? { discrepancyReason: input.discrepancyReason } : {}),
                ...(input.processedAt !== undefined ? { processedAt: input.processedAt } : {})
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/refundCreate
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation refundCreate($input: RefundInput!) {
                        refundCreate(input: $input) @idempotent(key: "${idempotencyKey}") {
                            refund {
                                id
                                note
                                createdAt
                                processedAt
                                totalRefundedSet {
                                    presentmentMoney {
                                        amount
                                        currencyCode
                                    }
                                    shopMoney {
                                        amount
                                        currencyCode
                                    }
                                }
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
            retries: 3
        });

        const parsed = ResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from Shopify',
                details: parsed.error.issues
            });
        }

        const refundCreate = parsed.data.data?.refundCreate;

        if (!refundCreate) {
            throw new nango.ActionError({
                message: 'No refund data returned from Shopify'
            });
        }

        return {
            refund: refundCreate.refund || undefined,
            userErrors: refundCreate.userErrors || []
        };
    }
});
