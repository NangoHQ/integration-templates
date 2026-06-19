import { z } from 'zod';
import { createAction } from 'nango';

const CustomIdInputSchema = z.object({
    key: z.string().describe('The key for the metafield.'),
    namespace: z.string().optional().describe('The container the metafield belongs to.'),
    value: z.string().describe('The value of the metafield.')
});

const InputSchema = z.object({
    id: z.string().optional().describe('The globally-unique ID of the order. Example: "gid://shopify/Order/1234567890"'),
    customId: CustomIdInputSchema.optional().describe('The custom ID of the order using a unique metafield value.')
});

const MoneySchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const MoneyBagSchema = z.object({
    shopMoney: MoneySchema,
    presentmentMoney: MoneySchema
});

const AddressSchema = z.object({
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    address1: z.string().optional().nullable(),
    address2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    province: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
    phone: z.string().optional().nullable()
});

const CustomerSchema = z.object({
    id: z.string(),
    email: z.string().optional().nullable(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    phone: z.string().optional().nullable()
});

const LineItemVariantSchema = z.object({
    id: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    sku: z.string().optional().nullable()
});

const LineItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    variantTitle: z.string().optional().nullable(),
    name: z.string(),
    quantity: z.number(),
    currentQuantity: z.number(),
    unfulfilledQuantity: z.number(),
    refundableQuantity: z.number(),
    nonFulfillableQuantity: z.number(),
    sku: z.string().optional().nullable(),
    vendor: z.string().optional().nullable(),
    requiresShipping: z.boolean(),
    isGiftCard: z.boolean(),
    taxable: z.boolean(),
    originalUnitPriceSet: MoneyBagSchema,
    originalTotalSet: MoneyBagSchema,
    discountedTotalSet: MoneyBagSchema,
    totalDiscountSet: MoneyBagSchema,
    variant: LineItemVariantSchema.optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    legacyResourceId: z.string().optional(),
    name: z.string(),
    confirmationNumber: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    displayFinancialStatus: z.string().optional().nullable(),
    displayFulfillmentStatus: z.string(),
    closed: z.boolean(),
    cancelledAt: z.string().optional().nullable(),
    cancelReason: z.string().optional().nullable(),
    fullyPaid: z.boolean(),
    refundable: z.boolean(),
    fulfillable: z.boolean(),
    requiresShipping: z.boolean(),
    createdAt: z.string(),
    processedAt: z.string(),
    currencyCode: z.string(),
    presentmentCurrencyCode: z.string(),
    currentTotalPriceSet: MoneyBagSchema,
    currentSubtotalPriceSet: MoneyBagSchema,
    currentTotalTaxSet: MoneyBagSchema,
    currentTotalDiscountsSet: MoneyBagSchema,
    currentShippingPriceSet: MoneyBagSchema,
    originalTotalPriceSet: MoneyBagSchema,
    netPaymentSet: MoneyBagSchema,
    customer: CustomerSchema.optional().nullable(),
    shippingAddress: AddressSchema.optional().nullable(),
    billingAddress: AddressSchema.optional().nullable(),
    lineItems: z.array(LineItemSchema)
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.record(z.string(), z.unknown()).optional()
});

const MoneyResponseSchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const MoneyBagResponseSchema = z.object({
    shopMoney: MoneyResponseSchema,
    presentmentMoney: MoneyResponseSchema
});

const AddressResponseSchema = z.object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    phone: z.string().nullable().optional()
});

const CustomerResponseSchema = z.object({
    id: z.string(),
    email: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional()
});

const LineItemVariantResponseSchema = z.object({
    id: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    sku: z.string().nullable().optional()
});

const LineItemResponseSchema = z.object({
    id: z.string(),
    title: z.string(),
    variantTitle: z.string().nullable().optional(),
    name: z.string(),
    quantity: z.number(),
    currentQuantity: z.number(),
    unfulfilledQuantity: z.number(),
    refundableQuantity: z.number(),
    nonFulfillableQuantity: z.number(),
    sku: z.string().nullable().optional(),
    vendor: z.string().nullable().optional(),
    requiresShipping: z.boolean(),
    isGiftCard: z.boolean(),
    taxable: z.boolean(),
    originalUnitPriceSet: MoneyBagResponseSchema,
    originalTotalSet: MoneyBagResponseSchema,
    discountedTotalSet: MoneyBagResponseSchema,
    totalDiscountSet: MoneyBagResponseSchema,
    variant: LineItemVariantResponseSchema.nullable().optional()
});

const LineItemsConnectionResponseSchema = z.object({
    nodes: z.array(LineItemResponseSchema)
});

const OrderResponseSchema = z.object({
    id: z.string(),
    legacyResourceId: z.string().optional(),
    name: z.string(),
    confirmationNumber: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    displayFinancialStatus: z.string().nullable().optional(),
    displayFulfillmentStatus: z.string(),
    closed: z.boolean(),
    cancelledAt: z.string().nullable().optional(),
    cancelReason: z.string().nullable().optional(),
    fullyPaid: z.boolean(),
    refundable: z.boolean(),
    fulfillable: z.boolean(),
    requiresShipping: z.boolean(),
    createdAt: z.string(),
    processedAt: z.string(),
    currencyCode: z.string(),
    presentmentCurrencyCode: z.string(),
    currentTotalPriceSet: MoneyBagResponseSchema,
    currentSubtotalPriceSet: MoneyBagResponseSchema,
    currentTotalTaxSet: MoneyBagResponseSchema,
    currentTotalDiscountsSet: MoneyBagResponseSchema,
    currentShippingPriceSet: MoneyBagResponseSchema,
    originalTotalPriceSet: MoneyBagResponseSchema,
    netPaymentSet: MoneyBagResponseSchema,
    customer: CustomerResponseSchema.nullable().optional(),
    shippingAddress: AddressResponseSchema.nullable().optional(),
    billingAddress: AddressResponseSchema.nullable().optional(),
    lineItems: LineItemsConnectionResponseSchema
});

const ProviderResponseSchema = z.object({
    data: z.object({
        orderByIdentifier: OrderResponseSchema.nullable().optional()
    }),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'Retrieve a Shopify order by the documented order identifier input.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema.nullable(),

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema> | null> => {
        if (!input.id && !input.customId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either id or customId must be provided.'
            });
        }

        const identifier: Record<string, unknown> = {};
        if (input.id) {
            identifier['id'] = input.id;
        }
        if (input.customId) {
            identifier['customId'] = {
                key: input.customId.key,
                value: input.customId.value,
                ...(input.customId.namespace !== undefined && { namespace: input.customId.namespace })
            };
        }

        const query = `
            query orderByIdentifier($identifier: OrderIdentifierInput!) {
                orderByIdentifier(identifier: $identifier) {
                    id
                    legacyResourceId
                    name
                    confirmationNumber
                    email
                    phone
                    note
                    displayFinancialStatus
                    displayFulfillmentStatus
                    closed
                    cancelledAt
                    cancelReason
                    fullyPaid
                    refundable
                    fulfillable
                    requiresShipping
                    createdAt
                    processedAt
                    currencyCode
                    presentmentCurrencyCode
                    currentTotalPriceSet {
                        shopMoney { amount currencyCode }
                        presentmentMoney { amount currencyCode }
                    }
                    currentSubtotalPriceSet {
                        shopMoney { amount currencyCode }
                        presentmentMoney { amount currencyCode }
                    }
                    currentTotalTaxSet {
                        shopMoney { amount currencyCode }
                        presentmentMoney { amount currencyCode }
                    }
                    currentTotalDiscountsSet {
                        shopMoney { amount currencyCode }
                        presentmentMoney { amount currencyCode }
                    }
                    currentShippingPriceSet {
                        shopMoney { amount currencyCode }
                        presentmentMoney { amount currencyCode }
                    }
                    originalTotalPriceSet {
                        shopMoney { amount currencyCode }
                        presentmentMoney { amount currencyCode }
                    }
                    netPaymentSet {
                        shopMoney { amount currencyCode }
                        presentmentMoney { amount currencyCode }
                    }
                    customer {
                        id
                        email
                        firstName
                        lastName
                        phone
                    }
                    shippingAddress {
                        firstName
                        lastName
                        address1
                        address2
                        city
                        province
                        country
                        zip
                        phone
                    }
                    billingAddress {
                        firstName
                        lastName
                        address1
                        address2
                        city
                        province
                        country
                        zip
                        phone
                    }
                    lineItems(first: 50) {
                        nodes {
                            id
                            title
                            variantTitle
                            name
                            quantity
                            currentQuantity
                            unfulfilledQuantity
                            refundableQuantity
                            nonFulfillableQuantity
                            sku
                            vendor
                            requiresShipping
                            isGiftCard
                            taxable
                            originalUnitPriceSet {
                                shopMoney { amount currencyCode }
                                presentmentMoney { amount currencyCode }
                            }
                            originalTotalSet {
                                shopMoney { amount currencyCode }
                                presentmentMoney { amount currencyCode }
                            }
                            discountedTotalSet {
                                shopMoney { amount currencyCode }
                                presentmentMoney { amount currencyCode }
                            }
                            totalDiscountSet {
                                shopMoney { amount currencyCode }
                                presentmentMoney { amount currencyCode }
                            }
                            variant {
                                id
                                title
                                sku
                            }
                        }
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/latest/queries/orderByIdentifier
        const response = await nango.post({
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query,
                variables: { identifier }
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);

        const firstError = parsedResponse.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message
            });
        }

        const order = parsedResponse.data.orderByIdentifier;

        if (!order) {
            return null;
        }

        return {
            id: order.id,
            legacyResourceId: order.legacyResourceId,
            name: order.name,
            confirmationNumber: order.confirmationNumber ?? null,
            email: order.email ?? null,
            phone: order.phone ?? null,
            note: order.note ?? null,
            displayFinancialStatus: order.displayFinancialStatus ?? null,
            displayFulfillmentStatus: order.displayFulfillmentStatus,
            closed: order.closed,
            cancelledAt: order.cancelledAt ?? null,
            cancelReason: order.cancelReason ?? null,
            fullyPaid: order.fullyPaid,
            refundable: order.refundable,
            fulfillable: order.fulfillable,
            requiresShipping: order.requiresShipping,
            createdAt: order.createdAt,
            processedAt: order.processedAt,
            currencyCode: order.currencyCode,
            presentmentCurrencyCode: order.presentmentCurrencyCode,
            currentTotalPriceSet: order.currentTotalPriceSet,
            currentSubtotalPriceSet: order.currentSubtotalPriceSet,
            currentTotalTaxSet: order.currentTotalTaxSet,
            currentTotalDiscountsSet: order.currentTotalDiscountsSet,
            currentShippingPriceSet: order.currentShippingPriceSet,
            originalTotalPriceSet: order.originalTotalPriceSet,
            netPaymentSet: order.netPaymentSet,
            customer: order.customer ?? null,
            shippingAddress: order.shippingAddress ?? null,
            billingAddress: order.billingAddress ?? null,
            lineItems: order.lineItems.nodes
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
