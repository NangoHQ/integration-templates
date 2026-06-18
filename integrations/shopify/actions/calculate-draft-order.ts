import { z } from 'zod';
import { createAction } from 'nango';

const MoneyInputSchema = z.object({
    amount: z.string().describe('Decimal money amount. Example: "10.00"'),
    currencyCode: z.string().describe('Currency code. Example: "USD"')
});

const DraftOrderAppliedDiscountInputSchema = z
    .object({
        amount: z.string().optional().describe('The value of the discount.'),
        amountWithCurrency: MoneyInputSchema.optional(),
        description: z.string().optional(),
        title: z.string().optional(),
        value: z.number().optional(),
        valueType: z.string().optional().describe('Example: "FIXED_AMOUNT" or "PERCENTAGE"')
    })
    .passthrough();

const AttributeInputSchema = z.object({
    key: z.string(),
    value: z.string()
});

const WeightInputSchema = z.object({
    unit: z.string().describe('Example: "KILOGRAMS"'),
    value: z.number()
});

const DraftOrderLineItemInputSchema = z
    .object({
        appliedDiscount: DraftOrderAppliedDiscountInputSchema.optional(),
        components: z.array(z.object({}).passthrough()).optional(),
        customAttributes: z.array(AttributeInputSchema).optional(),
        generatePriceOverride: z.boolean().optional(),
        originalUnitPriceWithCurrency: MoneyInputSchema.optional(),
        priceOverride: MoneyInputSchema.optional(),
        quantity: z.number(),
        requiresShipping: z.boolean().optional(),
        sku: z.string().optional(),
        taxable: z.boolean().optional(),
        title: z.string().optional(),
        uuid: z.string().optional(),
        variantId: z.string().optional().describe('Example: "gid://shopify/ProductVariant/123"'),
        weight: WeightInputSchema.optional()
    })
    .passthrough();

const MailingAddressInputSchema = z
    .object({
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        company: z.string().optional(),
        countryCode: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        provinceCode: z.string().optional(),
        zip: z.string().optional()
    })
    .passthrough();

const ShippingLineInputSchema = z
    .object({
        price: z.string().optional(),
        priceWithCurrency: MoneyInputSchema.optional(),
        shippingRateHandle: z.string().optional(),
        title: z.string().optional()
    })
    .passthrough();

const PurchasingEntityInputSchema = z
    .object({
        customerId: z.string().optional(),
        companyId: z.string().optional(),
        companyLocationId: z.string().optional(),
        contactId: z.string().optional()
    })
    .passthrough();

const InputSchema = z
    .object({
        acceptAutomaticDiscounts: z.boolean().optional(),
        allowDiscountCodesInCheckout: z.boolean().optional(),
        appliedDiscount: DraftOrderAppliedDiscountInputSchema.optional(),
        billingAddress: MailingAddressInputSchema.optional(),
        customAttributes: z.array(AttributeInputSchema).optional(),
        discountCodes: z.array(z.string()).optional(),
        email: z.string().optional(),
        lineItems: z.array(DraftOrderLineItemInputSchema),
        note: z.string().optional(),
        phone: z.string().optional(),
        poNumber: z.string().optional(),
        presentmentCurrencyCode: z.string().optional().describe('Example: "USD"'),
        purchasingEntity: PurchasingEntityInputSchema.optional(),
        reserveInventoryUntil: z.string().optional(),
        sessionToken: z.string().optional(),
        shippingAddress: MailingAddressInputSchema.optional(),
        shippingLine: ShippingLineInputSchema.optional(),
        sourceName: z.string().optional(),
        tags: z.array(z.string()).optional(),
        taxExempt: z.boolean().optional(),
        transformerFingerprint: z.string().optional(),
        useCustomerDefaultAddress: z.boolean().optional(),
        visibleToCustomer: z.boolean().optional()
    })
    .passthrough();

const MoneyBagSchema = z.object({
    presentmentMoney: z
        .object({
            amount: z.string(),
            currencyCode: z.string()
        })
        .optional(),
    shopMoney: z
        .object({
            amount: z.string(),
            currencyCode: z.string()
        })
        .optional()
});

const MoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const AppliedDiscountSchema = z.object({
    amountSet: MoneyBagSchema.optional(),
    description: z.string().optional(),
    title: z.string().optional(),
    value: z.number().optional(),
    valueType: z.string().optional()
});

const ProductSchema = z.object({
    id: z.string().optional(),
    title: z.string().optional()
});

const VariantSchema = z.object({
    id: z.string().optional()
});

const WeightSchema = z.object({
    unit: z.string().optional(),
    value: z.number().optional()
});

const CalculatedLineItemSchema = z.object({
    appliedDiscount: AppliedDiscountSchema.nullable().optional(),
    custom: z.boolean().optional(),
    customAttributes: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    discountedTotalSet: MoneyBagSchema.optional(),
    name: z.string().optional(),
    originalTotalSet: MoneyBagSchema.optional(),
    originalUnitPriceSet: MoneyBagSchema.optional(),
    priceOverride: MoneyV2Schema.nullable().optional(),
    product: ProductSchema.nullable().optional(),
    quantity: z.number().optional(),
    requiresShipping: z.boolean().optional(),
    sku: z.string().nullable().optional(),
    taxable: z.boolean().optional(),
    title: z.string().optional(),
    totalDiscountSet: MoneyBagSchema.optional(),
    uuid: z.string().optional(),
    variant: VariantSchema.nullable().optional(),
    variantTitle: z.string().nullable().optional(),
    vendor: z.string().nullable().optional(),
    weight: WeightSchema.nullable().optional()
});

const TaxLineSchema = z.object({
    channelLiable: z.boolean().optional(),
    priceSet: MoneyBagSchema.optional(),
    rate: z.number().optional(),
    ratePercentage: z.number().optional(),
    title: z.string().optional()
});

const ShippingLineSchema = z.object({
    custom: z.boolean().optional(),
    id: z.string().nullable().optional(),
    originalPriceSet: MoneyBagSchema.optional(),
    shippingRateHandle: z.string().nullable().optional(),
    title: z.string().optional()
});

const CustomerSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    taxExempt: z.boolean().optional()
});

const CalculatedDraftOrderSchema = z.object({
    lineItems: z.array(CalculatedLineItemSchema).optional(),
    subtotalPriceSet: MoneyBagSchema.optional(),
    totalShippingPriceSet: MoneyBagSchema.optional(),
    totalPriceSet: MoneyBagSchema.optional(),
    totalTaxSet: MoneyBagSchema.optional(),
    totalDiscountsSet: MoneyBagSchema.optional(),
    totalLineItemsPriceSet: MoneyBagSchema.optional(),
    lineItemsSubtotalPrice: MoneyBagSchema.optional(),
    shippingLine: ShippingLineSchema.nullable().optional(),
    taxLines: z.array(TaxLineSchema).optional(),
    presentmentCurrencyCode: z.string().optional(),
    currencyCode: z.string().optional(),
    customer: CustomerSchema.nullable().optional(),
    billingAddressMatchesShippingAddress: z.boolean().optional(),
    taxesIncluded: z.boolean().optional(),
    discountCodes: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    calculatedDraftOrder: CalculatedDraftOrderSchema.optional(),
    userErrors: z.array(UserErrorSchema).optional()
});

const action = createAction({
    description: 'Calculate totals and taxes for a Shopify draft order without creating it.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_draft_orders', 'write_draft_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation draftOrderCalculate($input: DraftOrderInput!) {
                draftOrderCalculate(input: $input) {
                    calculatedDraftOrder {
                        lineItems {
                            appliedDiscount {
                                amountSet {
                                    presentmentMoney { amount currencyCode }
                                    shopMoney { amount currencyCode }
                                }
                                description
                                title
                                value
                                valueType
                            }
                            custom
                            customAttributes { key value }
                            discountedTotalSet {
                                presentmentMoney { amount currencyCode }
                                shopMoney { amount currencyCode }
                            }
                            name
                            originalTotalSet {
                                presentmentMoney { amount currencyCode }
                                shopMoney { amount currencyCode }
                            }
                            originalUnitPriceSet {
                                presentmentMoney { amount currencyCode }
                                shopMoney { amount currencyCode }
                            }
                            priceOverride { amount currencyCode }
                            product { id title }
                            quantity
                            requiresShipping
                            sku
                            taxable
                            title
                            totalDiscountSet {
                                presentmentMoney { amount currencyCode }
                                shopMoney { amount currencyCode }
                            }
                            uuid
                            variant { id }
                            variantTitle
                            vendor
                            weight { unit value }
                        }
                        subtotalPriceSet {
                            presentmentMoney { amount currencyCode }
                            shopMoney { amount currencyCode }
                        }
                        totalShippingPriceSet {
                            presentmentMoney { amount currencyCode }
                            shopMoney { amount currencyCode }
                        }
                        totalPriceSet {
                            presentmentMoney { amount currencyCode }
                            shopMoney { amount currencyCode }
                        }
                        totalTaxSet {
                            presentmentMoney { amount currencyCode }
                            shopMoney { amount currencyCode }
                        }
                        totalDiscountsSet {
                            presentmentMoney { amount currencyCode }
                            shopMoney { amount currencyCode }
                        }
                        totalLineItemsPriceSet {
                            presentmentMoney { amount currencyCode }
                            shopMoney { amount currencyCode }
                        }
                        lineItemsSubtotalPrice {
                            presentmentMoney { amount currencyCode }
                            shopMoney { amount currencyCode }
                        }
                        shippingLine {
                            custom
                            id
                            originalPriceSet {
                                presentmentMoney { amount currencyCode }
                                shopMoney { amount currencyCode }
                            }
                            shippingRateHandle
                            title
                        }
                        taxLines {
                            channelLiable
                            priceSet {
                                presentmentMoney { amount currencyCode }
                                shopMoney { amount currencyCode }
                            }
                            rate
                            ratePercentage
                            title
                        }
                        presentmentCurrencyCode
                        currencyCode
                        customer {
                            id
                            email
                            firstName
                            lastName
                            taxExempt
                        }
                        billingAddressMatchesShippingAddress
                        taxesIncluded
                        discountCodes
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/latest/mutations/draftOrderCalculate
        const response = await nango.post({
            endpoint: 'admin/api/2025-04/graphql.json',
            data: {
                query: query,
                variables: { input: input }
            },
            retries: 3
        });

        const body = response.data;
        if (!body || typeof body !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify GraphQL API'
            });
        }

        const graphqlData = z
            .object({
                data: z
                    .object({
                        draftOrderCalculate: z.object({
                            calculatedDraftOrder: z.unknown().optional(),
                            userErrors: z.array(z.object({ field: z.array(z.string()).optional(), message: z.string() })).optional()
                        })
                    })
                    .nullable()
                    .optional(),
                errors: z.array(z.object({ message: z.string() })).optional()
            })
            .parse(body);

        if (graphqlData.errors && graphqlData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: graphqlData.errors.map((e) => e.message).join('; ')
            });
        }

        if (!graphqlData.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing data in Shopify GraphQL response'
            });
        }

        const result = graphqlData.data.draftOrderCalculate;
        const userErrors = result.userErrors || [];

        if (userErrors.length > 0) {
            return {
                calculatedDraftOrder: undefined,
                userErrors: userErrors.map((err) => ({
                    field: err.field,
                    message: err.message
                }))
            };
        }

        const rawCalculated = result.calculatedDraftOrder;
        if (!rawCalculated) {
            return {
                calculatedDraftOrder: undefined,
                userErrors: []
            };
        }

        const calculated = CalculatedDraftOrderSchema.parse(rawCalculated);

        return {
            calculatedDraftOrder: calculated,
            userErrors: []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
