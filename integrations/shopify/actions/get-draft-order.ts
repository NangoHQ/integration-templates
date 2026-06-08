import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the draft order. Example: "gid://shopify/DraftOrder/123456789"')
});

const MoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const MoneyBagSchema = z.object({
    shopMoney: MoneyV2Schema,
    presentmentMoney: MoneyV2Schema
});

const CustomerSchema = z.object({
    id: z.string(),
    email: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional()
});

const LineItemAppliedDiscountSchema = z.object({
    title: z.string().nullable().optional(),
    value: z.string().nullable().optional(),
    valueType: z.string().nullable().optional()
});

const TaxLineSchema = z.object({
    title: z.string(),
    rate: z.string().nullable().optional(),
    ratePercentage: z.string().nullable().optional(),
    priceSet: MoneyBagSchema.nullable().optional()
});

const LineItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    sku: z.string().nullable().optional(),
    quantity: z.number(),
    taxable: z.boolean(),
    requiresShipping: z.boolean(),
    isGiftCard: z.boolean(),
    custom: z.boolean(),
    variant: z
        .object({
            id: z.string(),
            title: z.string()
        })
        .nullable()
        .optional(),
    product: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional(),
    originalUnitPriceSet: MoneyBagSchema,
    discountedTotalSet: MoneyBagSchema,
    appliedDiscount: LineItemAppliedDiscountSchema.nullable().optional(),
    taxLines: z.array(TaxLineSchema).nullable().optional()
});

const AddressSchema = z.object({
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

const ShippingLineSchema = z.object({
    title: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    carrierIdentifier: z.string().nullable().optional(),
    discountedPriceSet: MoneyBagSchema.nullable().optional()
});

const DraftOrderAppliedDiscountSchema = z.object({
    title: z.string().nullable().optional(),
    value: z.string().nullable().optional(),
    valueType: z.string().nullable().optional()
});

const ProviderDraftOrderSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    email: z.string().nullable().optional(),
    note2: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable().optional(),
    invoiceUrl: z.string().nullable().optional(),
    invoiceSentAt: z.string().nullable().optional(),
    invoiceEmailTemplateSubject: z.string().nullable().optional(),
    currencyCode: z.string(),
    presentmentCurrencyCode: z.string(),
    taxesIncluded: z.boolean(),
    taxExempt: z.boolean(),
    tags: z.array(z.string()).nullable().optional(),
    customer: CustomerSchema.nullable().optional(),
    lineItems: z
        .object({
            edges: z.array(
                z.object({
                    node: LineItemSchema
                })
            )
        })
        .nullable()
        .optional(),
    totalPriceSet: MoneyBagSchema,
    subtotalPriceSet: MoneyBagSchema,
    totalTaxSet: MoneyBagSchema,
    totalShippingPriceSet: MoneyBagSchema,
    totalDiscountsSet: MoneyBagSchema,
    totalLineItemsPriceSet: MoneyBagSchema,
    shippingAddress: AddressSchema.nullable().optional(),
    billingAddress: AddressSchema.nullable().optional(),
    shippingLine: ShippingLineSchema.nullable().optional(),
    appliedDiscount: DraftOrderAppliedDiscountSchema.nullable().optional(),
    taxLines: z.array(TaxLineSchema).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    email: z.string().optional(),
    note2: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().optional(),
    invoiceUrl: z.string().optional(),
    invoiceSentAt: z.string().optional(),
    invoiceEmailTemplateSubject: z.string().optional(),
    currencyCode: z.string(),
    presentmentCurrencyCode: z.string(),
    taxesIncluded: z.boolean(),
    taxExempt: z.boolean(),
    tags: z.array(z.string()).optional(),
    customer: z
        .object({
            id: z.string(),
            email: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            phone: z.string().optional()
        })
        .optional(),
    lineItems: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                sku: z.string().optional(),
                quantity: z.number(),
                taxable: z.boolean(),
                requiresShipping: z.boolean(),
                isGiftCard: z.boolean(),
                custom: z.boolean(),
                variant: z
                    .object({
                        id: z.string(),
                        title: z.string()
                    })
                    .optional(),
                product: z
                    .object({
                        id: z.string()
                    })
                    .optional(),
                originalUnitPriceSet: MoneyBagSchema,
                discountedTotalSet: MoneyBagSchema,
                appliedDiscount: z
                    .object({
                        title: z.string().optional(),
                        value: z.string().optional(),
                        valueType: z.string().optional()
                    })
                    .optional(),
                taxLines: z
                    .array(
                        z.object({
                            title: z.string(),
                            rate: z.string().optional(),
                            ratePercentage: z.string().optional(),
                            priceSet: MoneyBagSchema.optional()
                        })
                    )
                    .optional()
            })
        )
        .optional(),
    totalPriceSet: MoneyBagSchema,
    subtotalPriceSet: MoneyBagSchema,
    totalTaxSet: MoneyBagSchema,
    totalShippingPriceSet: MoneyBagSchema,
    totalDiscountsSet: MoneyBagSchema,
    totalLineItemsPriceSet: MoneyBagSchema,
    shippingAddress: z
        .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            address1: z.string().optional(),
            address2: z.string().optional(),
            city: z.string().optional(),
            province: z.string().optional(),
            country: z.string().optional(),
            zip: z.string().optional(),
            phone: z.string().optional()
        })
        .optional(),
    billingAddress: z
        .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            address1: z.string().optional(),
            address2: z.string().optional(),
            city: z.string().optional(),
            province: z.string().optional(),
            country: z.string().optional(),
            zip: z.string().optional(),
            phone: z.string().optional()
        })
        .optional(),
    shippingLine: z
        .object({
            title: z.string().optional(),
            code: z.string().optional(),
            source: z.string().optional(),
            carrierIdentifier: z.string().optional(),
            discountedPriceSet: MoneyBagSchema.optional()
        })
        .optional(),
    appliedDiscount: z
        .object({
            title: z.string().optional(),
            value: z.string().optional(),
            valueType: z.string().optional()
        })
        .optional(),
    taxLines: z
        .array(
            z.object({
                title: z.string(),
                rate: z.string().optional(),
                ratePercentage: z.string().optional(),
                priceSet: MoneyBagSchema.optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a Shopify draft order by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-draft-order',
        group: 'Draft Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_draft_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: Omit<ProxyConfiguration, 'method'> = {
            // https://shopify.dev/docs/api/admin-graphql
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: `
                    query GetDraftOrder($id: ID!) {
                        draftOrder(id: $id) {
                            id
                            name
                            status
                            email
                            note2
                            createdAt
                            updatedAt
                            completedAt
                            invoiceUrl
                            invoiceSentAt
                            invoiceEmailTemplateSubject
                            currencyCode
                            presentmentCurrencyCode
                            taxesIncluded
                            taxExempt
                            tags
                            customer {
                                id
                                email
                                firstName
                                lastName
                                phone
                            }
                            lineItems(first: 50) {
                                edges {
                                    node {
                                        id
                                        name
                                        sku
                                        quantity
                                        taxable
                                        requiresShipping
                                        isGiftCard
                                        custom
                                        variant {
                                            id
                                            title
                                        }
                                        product {
                                            id
                                        }
                                        originalUnitPriceSet {
                                            shopMoney {
                                                amount
                                                currencyCode
                                            }
                                            presentmentMoney {
                                                amount
                                                currencyCode
                                            }
                                        }
                                        discountedTotalSet {
                                            shopMoney {
                                                amount
                                                currencyCode
                                            }
                                            presentmentMoney {
                                                amount
                                                currencyCode
                                            }
                                        }
                                        appliedDiscount {
                                            title
                                            value
                                            valueType
                                        }
                                        taxLines {
                                            title
                                            rate
                                            ratePercentage
                                            priceSet {
                                                shopMoney {
                                                    amount
                                                    currencyCode
                                                }
                                                presentmentMoney {
                                                    amount
                                                    currencyCode
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            totalPriceSet {
                                shopMoney {
                                    amount
                                    currencyCode
                                }
                                presentmentMoney {
                                    amount
                                    currencyCode
                                }
                            }
                            subtotalPriceSet {
                                shopMoney {
                                    amount
                                    currencyCode
                                }
                                presentmentMoney {
                                    amount
                                    currencyCode
                                }
                            }
                            totalTaxSet {
                                shopMoney {
                                    amount
                                    currencyCode
                                }
                                presentmentMoney {
                                    amount
                                    currencyCode
                                }
                            }
                            totalShippingPriceSet {
                                shopMoney {
                                    amount
                                    currencyCode
                                }
                                presentmentMoney {
                                    amount
                                    currencyCode
                                }
                            }
                            totalDiscountsSet {
                                shopMoney {
                                    amount
                                    currencyCode
                                }
                                presentmentMoney {
                                    amount
                                    currencyCode
                                }
                            }
                            totalLineItemsPriceSet {
                                shopMoney {
                                    amount
                                    currencyCode
                                }
                                presentmentMoney {
                                    amount
                                    currencyCode
                                }
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
                            shippingLine {
                                title
                                code
                                source
                                carrierIdentifier
                                discountedPriceSet {
                                    shopMoney {
                                        amount
                                        currencyCode
                                    }
                                    presentmentMoney {
                                        amount
                                        currencyCode
                                    }
                                }
                            }
                            appliedDiscount {
                                title
                                value
                                valueType
                            }
                            taxLines {
                                title
                                rate
                                ratePercentage
                                priceSet {
                                    shopMoney {
                                        amount
                                        currencyCode
                                    }
                                    presentmentMoney {
                                        amount
                                        currencyCode
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const body = z
            .object({
                data: z
                    .object({
                        draftOrder: ProviderDraftOrderSchema.nullable().optional()
                    })
                    .optional(),
                errors: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        if (body.errors != null && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Shopify GraphQL returned errors',
                errors: body.errors
            });
        }

        const draftOrder = body.data?.draftOrder;
        if (draftOrder == null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Draft order not found for id: ${input.id}`
            });
        }

        const shippingAddress = draftOrder.shippingAddress;
        const billingAddress = draftOrder.billingAddress;

        return {
            id: draftOrder.id,
            name: draftOrder.name,
            status: draftOrder.status,
            ...(draftOrder.email != null && { email: draftOrder.email }),
            ...(draftOrder.note2 != null && { note2: draftOrder.note2 }),
            createdAt: draftOrder.createdAt,
            updatedAt: draftOrder.updatedAt,
            ...(draftOrder.completedAt != null && { completedAt: draftOrder.completedAt }),
            ...(draftOrder.invoiceUrl != null && { invoiceUrl: draftOrder.invoiceUrl }),
            ...(draftOrder.invoiceSentAt != null && { invoiceSentAt: draftOrder.invoiceSentAt }),
            ...(draftOrder.invoiceEmailTemplateSubject != null && { invoiceEmailTemplateSubject: draftOrder.invoiceEmailTemplateSubject }),
            currencyCode: draftOrder.currencyCode,
            presentmentCurrencyCode: draftOrder.presentmentCurrencyCode,
            taxesIncluded: draftOrder.taxesIncluded,
            taxExempt: draftOrder.taxExempt,
            ...(draftOrder.tags != null && { tags: draftOrder.tags }),
            ...(draftOrder.customer != null && {
                customer: {
                    id: draftOrder.customer.id,
                    ...(draftOrder.customer.email != null && { email: draftOrder.customer.email }),
                    ...(draftOrder.customer.firstName != null && { firstName: draftOrder.customer.firstName }),
                    ...(draftOrder.customer.lastName != null && { lastName: draftOrder.customer.lastName }),
                    ...(draftOrder.customer.phone != null && { phone: draftOrder.customer.phone })
                }
            }),
            ...(draftOrder.lineItems != null && {
                lineItems: draftOrder.lineItems.edges.map((edge) => {
                    const node = edge.node;
                    return {
                        id: node.id,
                        name: node.name,
                        ...(node.sku != null && { sku: node.sku }),
                        quantity: node.quantity,
                        taxable: node.taxable,
                        requiresShipping: node.requiresShipping,
                        isGiftCard: node.isGiftCard,
                        custom: node.custom,
                        ...(node.variant != null && {
                            variant: {
                                id: node.variant.id,
                                title: node.variant.title
                            }
                        }),
                        ...(node.product != null && {
                            product: {
                                id: node.product.id
                            }
                        }),
                        originalUnitPriceSet: node.originalUnitPriceSet,
                        discountedTotalSet: node.discountedTotalSet,
                        ...(node.appliedDiscount != null && {
                            appliedDiscount: {
                                ...(node.appliedDiscount.title != null && { title: node.appliedDiscount.title }),
                                ...(node.appliedDiscount.value != null && { value: node.appliedDiscount.value }),
                                ...(node.appliedDiscount.valueType != null && { valueType: node.appliedDiscount.valueType })
                            }
                        }),
                        ...(node.taxLines != null && {
                            taxLines: node.taxLines.map((taxLine) => ({
                                title: taxLine.title,
                                ...(taxLine.rate != null && { rate: taxLine.rate }),
                                ...(taxLine.ratePercentage != null && { ratePercentage: taxLine.ratePercentage }),
                                ...(taxLine.priceSet != null && { priceSet: taxLine.priceSet })
                            }))
                        })
                    };
                })
            }),
            totalPriceSet: draftOrder.totalPriceSet,
            subtotalPriceSet: draftOrder.subtotalPriceSet,
            totalTaxSet: draftOrder.totalTaxSet,
            totalShippingPriceSet: draftOrder.totalShippingPriceSet,
            totalDiscountsSet: draftOrder.totalDiscountsSet,
            totalLineItemsPriceSet: draftOrder.totalLineItemsPriceSet,
            ...(shippingAddress != null && {
                shippingAddress: {
                    ...(shippingAddress.firstName != null && { firstName: shippingAddress.firstName }),
                    ...(shippingAddress.lastName != null && { lastName: shippingAddress.lastName }),
                    ...(shippingAddress.address1 != null && { address1: shippingAddress.address1 }),
                    ...(shippingAddress.address2 != null && { address2: shippingAddress.address2 }),
                    ...(shippingAddress.city != null && { city: shippingAddress.city }),
                    ...(shippingAddress.province != null && { province: shippingAddress.province }),
                    ...(shippingAddress.country != null && { country: shippingAddress.country }),
                    ...(shippingAddress.zip != null && { zip: shippingAddress.zip }),
                    ...(shippingAddress.phone != null && { phone: shippingAddress.phone })
                }
            }),
            ...(billingAddress != null && {
                billingAddress: {
                    ...(billingAddress.firstName != null && { firstName: billingAddress.firstName }),
                    ...(billingAddress.lastName != null && { lastName: billingAddress.lastName }),
                    ...(billingAddress.address1 != null && { address1: billingAddress.address1 }),
                    ...(billingAddress.address2 != null && { address2: billingAddress.address2 }),
                    ...(billingAddress.city != null && { city: billingAddress.city }),
                    ...(billingAddress.province != null && { province: billingAddress.province }),
                    ...(billingAddress.country != null && { country: billingAddress.country }),
                    ...(billingAddress.zip != null && { zip: billingAddress.zip }),
                    ...(billingAddress.phone != null && { phone: billingAddress.phone })
                }
            }),
            ...(draftOrder.shippingLine != null && {
                shippingLine: {
                    ...(draftOrder.shippingLine.title != null && { title: draftOrder.shippingLine.title }),
                    ...(draftOrder.shippingLine.code != null && { code: draftOrder.shippingLine.code }),
                    ...(draftOrder.shippingLine.source != null && { source: draftOrder.shippingLine.source }),
                    ...(draftOrder.shippingLine.carrierIdentifier != null && { carrierIdentifier: draftOrder.shippingLine.carrierIdentifier }),
                    ...(draftOrder.shippingLine.discountedPriceSet != null && { discountedPriceSet: draftOrder.shippingLine.discountedPriceSet })
                }
            }),
            ...(draftOrder.appliedDiscount != null && {
                appliedDiscount: {
                    ...(draftOrder.appliedDiscount.title != null && { title: draftOrder.appliedDiscount.title }),
                    ...(draftOrder.appliedDiscount.value != null && { value: draftOrder.appliedDiscount.value }),
                    ...(draftOrder.appliedDiscount.valueType != null && { valueType: draftOrder.appliedDiscount.valueType })
                }
            }),
            ...(draftOrder.taxLines != null && {
                taxLines: draftOrder.taxLines.map((taxLine) => ({
                    title: taxLine.title,
                    ...(taxLine.rate != null && { rate: taxLine.rate }),
                    ...(taxLine.ratePercentage != null && { ratePercentage: taxLine.ratePercentage }),
                    ...(taxLine.priceSet != null && { priceSet: taxLine.priceSet })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
