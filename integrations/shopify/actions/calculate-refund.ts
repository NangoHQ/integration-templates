import { z } from 'zod';
import { createAction } from 'nango';

const MoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const MoneyBagSchema = z.object({
    shopMoney: MoneyV2Schema,
    presentmentMoney: MoneyV2Schema
});

const RefundLineItemInputSchema = z.object({
    lineItemId: z.string().describe('The ID of the line item to refund. Example: "gid://shopify/LineItem/123"'),
    quantity: z.number().int().describe('The quantity to refund'),
    restockType: z.enum(['CANCEL', 'NO_RESTOCK', 'RETURN']).optional().describe('The type of restock'),
    locationId: z.string().optional().describe('The intended location for restocking')
});

const RefundDutyInputSchema = z.object({
    dutyId: z.string().describe('The ID of the duty to refund. Example: "gid://shopify/Duty/123"'),
    refundType: z.enum(['FULL', 'PROPORTIONAL']).optional().describe('The type of duty refund')
});

const MoneyInputSchema = z.object({
    amount: z.string().describe('Decimal money amount'),
    currencyCode: z.string().describe('Currency code. Example: "USD"')
});

const InputSchema = z.object({
    orderId: z.string().describe('The ID of the order. Example: "gid://shopify/Order/123"'),
    refundLineItems: z.array(RefundLineItemInputSchema).describe('The line items to include in the refund'),
    refundDuties: z.array(RefundDutyInputSchema).optional().describe('The duties to include in the refund'),
    shippingAmount: MoneyInputSchema.optional().describe('The amount to refund for shipping. Overrides refundShipping.'),
    refundShipping: z.boolean().optional().describe('Whether to refund the full shipping amount'),
    refundMethodAllocation: z.enum(['ORIGINAL_PAYMENT_METHODS', 'STORE_CREDIT']).optional().describe('Which refund methods to allocate to'),
    suggestFullRefund: z.boolean().optional().describe('Whether to suggest a refund from all refundable line items')
});

const ShippingRefundSchema = z.object({
    amountSet: MoneyBagSchema,
    maximumRefundableSet: MoneyBagSchema,
    taxSet: MoneyBagSchema
});

const RefundDutySchema = z.object({
    amountSet: MoneyBagSchema,
    originalDuty: z.object({ id: z.string().optional() }).optional()
});

const RefundLineItemSchema = z.object({
    lineItem: z.object({ id: z.string().optional() }).optional(),
    quantity: z.number().int(),
    priceSet: MoneyBagSchema,
    subtotalSet: MoneyBagSchema,
    totalTaxSet: MoneyBagSchema,
    restockType: z.string().optional(),
    location: z.object({ id: z.string().optional() }).optional()
});

const SuggestedOrderTransactionSchema = z.object({
    accountNumber: z.string().optional(),
    amountSet: MoneyBagSchema,
    formattedGateway: z.string().optional(),
    gateway: z.string().optional(),
    kind: z.string(),
    maximumRefundableSet: MoneyBagSchema.optional(),
    parentTransaction: z.object({ id: z.string().optional() }).optional()
});

const SuggestedRefundMethodSchema = z.object({
    __typename: z.string(),
    amount: MoneyBagSchema,
    maximumRefundable: MoneyBagSchema
});

const OutputSchema = z.object({
    amountSet: MoneyBagSchema,
    maximumRefundableSet: MoneyBagSchema,
    subtotalSet: MoneyBagSchema,
    totalTaxSet: MoneyBagSchema,
    totalDutiesSet: MoneyBagSchema,
    totalCartDiscountAmountSet: MoneyBagSchema,
    discountedSubtotalSet: MoneyBagSchema,
    shipping: ShippingRefundSchema,
    refundDuties: z.array(RefundDutySchema),
    refundLineItems: z.array(RefundLineItemSchema),
    suggestedTransactions: z.array(SuggestedOrderTransactionSchema),
    suggestedRefundMethods: z.array(SuggestedRefundMethodSchema)
});

const SuggestedRefundResponseSchema = z.object({
    data: z
        .object({
            order: z
                .object({
                    id: z.string().optional(),
                    suggestedRefund: OutputSchema.nullable().optional()
                })
                .nullable()
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Calculate a suggested refund amount for a Shopify order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: Record<string, unknown> = {
            id: input.orderId,
            refundLineItems: input.refundLineItems.map((item) => ({
                lineItemId: item.lineItemId,
                quantity: item.quantity,
                ...(item.restockType !== undefined && { restockType: item.restockType }),
                ...(item.locationId !== undefined && { locationId: item.locationId })
            }))
        };

        if (input.refundDuties !== undefined) {
            variables['refundDuties'] = input.refundDuties.map((duty) => ({
                dutyId: duty.dutyId,
                ...(duty.refundType !== undefined && { refundType: duty.refundType })
            }));
        }

        if (input.shippingAmount !== undefined) {
            variables['shippingAmount'] = input.shippingAmount;
        }

        if (input.refundShipping !== undefined) {
            variables['refundShipping'] = input.refundShipping;
        }

        if (input.refundMethodAllocation !== undefined) {
            variables['refundMethodAllocation'] = input.refundMethodAllocation;
        }

        if (input.suggestFullRefund !== undefined) {
            variables['suggestFullRefund'] = input.suggestFullRefund;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-07/queries/order
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: `
                    query CalculateRefund(
                        $id: ID!,
                        $refundLineItems: [RefundLineItemInput!],
                        $refundDuties: [RefundDutyInput!],
                        $shippingAmount: Money,
                        $refundShipping: Boolean,
                        $refundMethodAllocation: RefundMethodAllocation,
                        $suggestFullRefund: Boolean
                    ) {
                        order(id: $id) {
                            id
                            suggestedRefund(
                                refundLineItems: $refundLineItems,
                                refundDuties: $refundDuties,
                                shippingAmount: $shippingAmount,
                                refundShipping: $refundShipping,
                                refundMethodAllocation: $refundMethodAllocation,
                                suggestFullRefund: $suggestFullRefund
                            ) {
                                amountSet {
                                    shopMoney { amount currencyCode }
                                    presentmentMoney { amount currencyCode }
                                }
                                maximumRefundableSet {
                                    shopMoney { amount currencyCode }
                                    presentmentMoney { amount currencyCode }
                                }
                                subtotalSet {
                                    shopMoney { amount currencyCode }
                                    presentmentMoney { amount currencyCode }
                                }
                                totalTaxSet {
                                    shopMoney { amount currencyCode }
                                    presentmentMoney { amount currencyCode }
                                }
                                totalDutiesSet {
                                    shopMoney { amount currencyCode }
                                    presentmentMoney { amount currencyCode }
                                }
                                totalCartDiscountAmountSet {
                                    shopMoney { amount currencyCode }
                                    presentmentMoney { amount currencyCode }
                                }
                                discountedSubtotalSet {
                                    shopMoney { amount currencyCode }
                                    presentmentMoney { amount currencyCode }
                                }
                                shipping {
                                    amountSet {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                    taxSet {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                    maximumRefundableSet {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                }
                                refundDuties {
                                    amountSet {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                    originalDuty {
                                        id
                                    }
                                }
                                refundLineItems {
                                    lineItem {
                                        id
                                    }
                                    quantity
                                    priceSet {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                    subtotalSet {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                    totalTaxSet {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                    restockType
                                    location {
                                        id
                                    }
                                }
                                suggestedTransactions {
                                    accountNumber
                                    amountSet {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                    formattedGateway
                                    gateway
                                    kind
                                    maximumRefundableSet {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                    parentTransaction {
                                        id
                                    }
                                }
                                suggestedRefundMethods {
                                    __typename
                                    amount {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                    maximumRefundable {
                                        shopMoney { amount currencyCode }
                                        presentmentMoney { amount currencyCode }
                                    }
                                }
                            }
                        }
                    }
                `,
                variables
            },
            retries: 3
        });

        const parsed = SuggestedRefundResponseSchema.parse(response.data);

        const graphqlErrors = parsed.errors;
        if (graphqlErrors && graphqlErrors.length > 0) {
            const firstError = graphqlErrors[0];
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError?.message || 'Unknown GraphQL error',
                errors: graphqlErrors
            });
        }

        const order = parsed.data?.order;
        if (!order) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Order not found',
                orderId: input.orderId
            });
        }

        const suggestedRefund = order.suggestedRefund;
        if (!suggestedRefund) {
            throw new nango.ActionError({
                type: 'no_refund',
                message: 'Unable to calculate suggested refund for this order',
                orderId: input.orderId
            });
        }

        return suggestedRefund;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
