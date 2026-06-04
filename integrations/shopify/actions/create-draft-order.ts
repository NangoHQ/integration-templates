import { z } from 'zod';
import { createAction } from 'nango';

// https://shopify.dev/docs/api/admin-graphql/2025-04/input-objects/AttributeInput
const AttributeInputSchema = z.object({
    key: z.string(),
    value: z.string()
});

// https://shopify.dev/docs/api/admin-graphql/2025-04/input-objects/MailingAddressInput
const AddressInputSchema = z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    company: z.string().optional(),
    country: z.string().optional(),
    countryCode: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    province: z.string().optional(),
    provinceCode: z.string().optional(),
    zip: z.string().optional()
});

// https://shopify.dev/docs/api/admin-graphql/2025-04/input-objects/DraftOrderAppliedDiscountInput
const AppliedDiscountInputSchema = z.object({
    description: z.string().optional(),
    title: z.string().optional(),
    value: z.number(),
    valueType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE']),
    amount: z.number().optional()
});

// https://shopify.dev/docs/api/admin-graphql/2025-04/input-objects/DraftOrderLineItemInput
const LineItemInputSchema = z.object({
    variantId: z.string().optional(),
    title: z.string().optional(),
    quantity: z.number(),
    price: z.number().optional(),
    currencyCode: z.string().optional(),
    appliedDiscount: AppliedDiscountInputSchema.optional(),
    customAttributes: z.array(AttributeInputSchema).optional(),
    components: z
        .array(
            z.object({
                variantId: z.string(),
                quantity: z.number()
            })
        )
        .optional(),
    requiresShipping: z.boolean().optional(),
    sku: z.string().optional(),
    taxable: z.boolean().optional(),
    uuid: z.string().optional()
});

// https://shopify.dev/docs/api/admin-graphql/2025-04/input-objects/PurchasingCompanyInput
const PurchasingCompanyInputSchema = z.object({
    companyId: z.string(),
    companyContactId: z.string(),
    companyLocationId: z.string()
});

// https://shopify.dev/docs/api/admin-graphql/2025-04/input-objects/PurchasingEntityInput
const PurchasingEntityInputSchema = z.object({
    customerId: z.string().optional(),
    purchasingCompany: PurchasingCompanyInputSchema.optional()
});

// https://shopify.dev/docs/api/admin-graphql/2025-04/input-objects/ShippingLineInput
const ShippingLineInputSchema = z.object({
    title: z.string().optional(),
    price: z.number().optional(),
    priceWithCurrency: z
        .object({
            amount: z.string(),
            currencyCode: z.string()
        })
        .optional(),
    shippingRateHandle: z.string().optional()
});

// https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/draftOrderCreate
const InputSchema = z.object({
    lineItems: z.array(LineItemInputSchema).min(1),
    customerId: z.string().optional(),
    purchasingEntity: PurchasingEntityInputSchema.optional(),
    email: z.string().optional(),
    note: z.string().optional(),
    tags: z.array(z.string()).optional(),
    appliedDiscount: AppliedDiscountInputSchema.optional(),
    shippingAddress: AddressInputSchema.optional(),
    billingAddress: AddressInputSchema.optional(),
    shippingLine: ShippingLineInputSchema.optional(),
    taxExempt: z.boolean().optional(),
    presentmentCurrencyCode: z.string().optional(),
    customAttributes: z.array(AttributeInputSchema).optional(),
    discountCodes: z.array(z.string()).optional(),
    phone: z.string().optional(),
    poNumber: z.string().optional(),
    reserveInventoryUntil: z.string().optional(),
    visibleToCustomer: z.boolean().optional()
});

const AddressOutputSchema = z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    company: z.string().optional(),
    country: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    province: z.string().optional(),
    zip: z.string().optional()
});

const AppliedDiscountOutputSchema = z.object({
    description: z.string().optional(),
    title: z.string().optional(),
    value: z.number().optional(),
    valueType: z.string().optional(),
    amount: z.string().optional()
});

const LineItemOutputSchema = z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    quantity: z.number().optional(),
    custom: z.boolean().optional(),
    variant: z
        .object({
            id: z.string().optional(),
            title: z.string().optional()
        })
        .optional(),
    originalUnitPriceSet: z
        .object({
            shopMoney: z
                .object({
                    amount: z.string().optional(),
                    currencyCode: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const CustomerOutputSchema = z.object({
    id: z.string().optional(),
    email: z.string().optional()
});

const PurchasingEntityOutputSchema = z.object({
    customer: CustomerOutputSchema.optional(),
    company: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    contact: z
        .object({
            id: z.string().optional()
        })
        .optional(),
    location: z
        .object({
            id: z.string().optional()
        })
        .optional()
});

const MoneyBagOutputSchema = z.object({
    shopMoney: z
        .object({
            amount: z.string().optional(),
            currencyCode: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    email: z.string().optional(),
    note2: z.string().optional(),
    tags: z.array(z.string()).optional(),
    taxExempt: z.boolean().optional(),
    presentmentCurrencyCode: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    customer: CustomerOutputSchema.optional(),
    purchasingEntity: PurchasingEntityOutputSchema.optional(),
    shippingAddress: AddressOutputSchema.optional(),
    billingAddress: AddressOutputSchema.optional(),
    lineItems: z.array(LineItemOutputSchema).optional(),
    appliedDiscount: AppliedDiscountOutputSchema.optional(),
    totalPriceSet: MoneyBagOutputSchema.optional()
});

type LineItemVariable = {
    quantity: number;
    variantId?: string;
    title?: string;
    priceOverride?: { amount: string; currencyCode: string };
    appliedDiscount?: unknown;
    customAttributes?: unknown;
    components?: unknown;
    requiresShipping?: boolean;
    sku?: string;
    taxable?: boolean;
    uuid?: string;
};

type DraftOrderVariables = {
    lineItems: LineItemVariable[];
    customerId?: string;
    purchasingEntity?: unknown;
    email?: string;
    note?: string;
    tags?: string[];
    appliedDiscount?: unknown;
    shippingAddress?: unknown;
    billingAddress?: unknown;
    shippingLine?: unknown;
    taxExempt?: boolean;
    presentmentCurrencyCode?: string;
    customAttributes?: unknown;
    discountCodes?: string[];
    phone?: string;
    poNumber?: string;
    reserveInventoryUntil?: string;
    visibleToCustomer?: boolean;
};

function buildGraphQLVariables(input: z.infer<typeof InputSchema>) {
    const currencyCode = input.presentmentCurrencyCode || 'USD';

    const variables: DraftOrderVariables = {
        lineItems: input.lineItems.map((item) => {
            const line: LineItemVariable = {
                quantity: item.quantity
            };

            if (item.variantId !== undefined) {
                line.variantId = item.variantId;
            }
            if (item.title !== undefined) {
                line.title = item.title;
            }
            if (item.price !== undefined) {
                line.priceOverride = {
                    amount: item.price.toFixed(2),
                    currencyCode: item.currencyCode || currencyCode
                };
            }
            if (item.appliedDiscount !== undefined) {
                line.appliedDiscount = item.appliedDiscount;
            }
            if (item.customAttributes !== undefined) {
                line.customAttributes = item.customAttributes;
            }
            if (item.components !== undefined) {
                line.components = item.components;
            }
            if (item.requiresShipping !== undefined) {
                line.requiresShipping = item.requiresShipping;
            }
            if (item.sku !== undefined) {
                line.sku = item.sku;
            }
            if (item.taxable !== undefined) {
                line.taxable = item.taxable;
            }
            if (item.uuid !== undefined) {
                line.uuid = item.uuid;
            }

            return line;
        })
    };

    if (input.customerId !== undefined) {
        variables.customerId = input.customerId;
    }
    if (input.purchasingEntity !== undefined) {
        variables.purchasingEntity = input.purchasingEntity;
    }
    if (input.email !== undefined) {
        variables.email = input.email;
    }
    if (input.note !== undefined) {
        variables.note = input.note;
    }
    if (input.tags !== undefined) {
        variables.tags = input.tags;
    }
    if (input.appliedDiscount !== undefined) {
        variables.appliedDiscount = input.appliedDiscount;
    }
    if (input.shippingAddress !== undefined) {
        variables.shippingAddress = input.shippingAddress;
    }
    if (input.billingAddress !== undefined) {
        variables.billingAddress = input.billingAddress;
    }
    if (input.shippingLine !== undefined) {
        const shipping: {
            title?: string;
            priceWithCurrency?: { amount: string; currencyCode: string };
            shippingRateHandle?: string;
        } = {};
        if (input.shippingLine.title !== undefined) {
            shipping.title = input.shippingLine.title;
        }
        if (input.shippingLine.priceWithCurrency !== undefined) {
            shipping.priceWithCurrency = input.shippingLine.priceWithCurrency;
        } else if (input.shippingLine.price !== undefined) {
            shipping.priceWithCurrency = {
                amount: input.shippingLine.price.toFixed(2),
                currencyCode: currencyCode
            };
        }
        if (input.shippingLine.shippingRateHandle !== undefined) {
            shipping.shippingRateHandle = input.shippingLine.shippingRateHandle;
        }
        variables.shippingLine = shipping;
    }
    if (input.taxExempt !== undefined) {
        variables.taxExempt = input.taxExempt;
    }
    if (input.presentmentCurrencyCode !== undefined) {
        variables.presentmentCurrencyCode = input.presentmentCurrencyCode;
    }
    if (input.customAttributes !== undefined) {
        variables.customAttributes = input.customAttributes;
    }
    if (input.discountCodes !== undefined) {
        variables.discountCodes = input.discountCodes;
    }
    if (input.phone !== undefined) {
        variables.phone = input.phone;
    }
    if (input.poNumber !== undefined) {
        variables.poNumber = input.poNumber;
    }
    if (input.reserveInventoryUntil !== undefined) {
        variables.reserveInventoryUntil = input.reserveInventoryUntil;
    }
    if (input.visibleToCustomer !== undefined) {
        variables.visibleToCustomer = input.visibleToCustomer;
    }

    return { input: variables };
}

const action = createAction({
    description: 'Create a Shopify draft order with line items and customer details.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-draft-order',
        group: 'Draft Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_draft_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation draftOrderCreate($input: DraftOrderInput!) {
                draftOrderCreate(input: $input) {
                    draftOrder {
                        id
                        name
                        status
                        email
                        note2
                        tags
                        taxExempt
                        presentmentCurrencyCode
                        createdAt
                        updatedAt
                        customer {
                            id
                            email
                        }
                        purchasingEntity {
                            ... on Customer {
                                id
                                email
                            }
                            ... on PurchasingCompany {
                                company {
                                    id
                                    name
                                }
                                contact {
                                    id
                                }
                                location {
                                    id
                                }
                            }
                        }
                        shippingAddress {
                            address1
                            address2
                            city
                            province
                            country
                            zip
                            phone
                            firstName
                            lastName
                            company
                        }
                        billingAddress {
                            address1
                            address2
                            city
                            province
                            country
                            zip
                            phone
                            firstName
                            lastName
                            company
                        }
                        lineItems(first: 100) {
                            edges {
                                node {
                                    id
                                    title
                                    quantity
                                    custom
                                    variant {
                                        id
                                        title
                                    }
                                    originalUnitPriceSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                }
                            }
                        }
                        appliedDiscount {
                            description
                            value
                            amount
                            valueType
                            title
                        }
                        totalPriceSet {
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
        `;

        const variables = buildGraphQLVariables(input);

        // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/draftOrderCreate
        const response = await nango.post({
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        });

        const ProviderLineItemSchema = z.object({
            id: z.string().optional(),
            title: z.string().optional(),
            quantity: z.number().optional(),
            custom: z.boolean().optional(),
            variant: z.object({ id: z.string().optional(), title: z.string().optional() }).nullable().optional(),
            originalUnitPriceSet: z
                .object({ shopMoney: z.object({ amount: z.string().optional(), currencyCode: z.string().optional() }).optional() })
                .nullable()
                .optional()
        });

        const ProviderDraftOrderSchema = z.object({
            id: z.string(),
            name: z.string().nullable().optional(),
            status: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
            note2: z.string().nullable().optional(),
            tags: z.array(z.string()).nullable().optional(),
            taxExempt: z.boolean().nullable().optional(),
            presentmentCurrencyCode: z.string().nullable().optional(),
            createdAt: z.string().nullable().optional(),
            updatedAt: z.string().nullable().optional(),
            customer: z.object({ id: z.string().optional(), email: z.string().optional() }).nullable().optional(),
            purchasingEntity: z
                .object({
                    customer: z.object({ id: z.string().optional(), email: z.string().optional() }).nullable().optional(),
                    company: z.object({ id: z.string().optional(), name: z.string().optional() }).nullable().optional(),
                    contact: z.object({ id: z.string().optional() }).nullable().optional(),
                    location: z.object({ id: z.string().optional() }).nullable().optional()
                })
                .nullable()
                .optional(),
            shippingAddress: z
                .object({
                    address1: z.string().optional(),
                    address2: z.string().optional(),
                    city: z.string().optional(),
                    company: z.string().optional(),
                    country: z.string().optional(),
                    zip: z.string().optional(),
                    phone: z.string().optional(),
                    firstName: z.string().optional(),
                    lastName: z.string().optional(),
                    province: z.string().optional()
                })
                .nullable()
                .optional(),
            billingAddress: z
                .object({
                    address1: z.string().optional(),
                    address2: z.string().optional(),
                    city: z.string().optional(),
                    company: z.string().optional(),
                    country: z.string().optional(),
                    zip: z.string().optional(),
                    phone: z.string().optional(),
                    firstName: z.string().optional(),
                    lastName: z.string().optional(),
                    province: z.string().optional()
                })
                .nullable()
                .optional(),
            lineItems: z
                .object({ edges: z.array(z.object({ node: ProviderLineItemSchema })).optional() })
                .nullable()
                .optional(),
            appliedDiscount: z
                .object({
                    description: z.string().optional(),
                    value: z.number().optional(),
                    amount: z.string().optional(),
                    valueType: z.string().optional(),
                    title: z.string().optional()
                })
                .nullable()
                .optional(),
            totalPriceSet: z
                .object({ shopMoney: z.object({ amount: z.string().optional(), currencyCode: z.string().optional() }).optional() })
                .nullable()
                .optional()
        });

        const ShopifyResponseSchema = z.object({
            data: z.object({
                draftOrderCreate: z.object({
                    draftOrder: ProviderDraftOrderSchema.nullable().optional(),
                    userErrors: z.array(z.object({ field: z.string().optional(), message: z.string().optional() })).optional()
                })
            }),
            errors: z.array(z.object({ message: z.string().optional() })).optional()
        });

        const parsedResponse = ShopifyResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from Shopify'
            });
        }

        const topErrors = parsedResponse.data.errors || [];
        if (topErrors.length > 0) {
            const firstError = topErrors[0];
            if (!firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: 'GraphQL execution error'
                });
            }
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError.message || 'GraphQL execution error'
            });
        }

        const result = parsedResponse.data.data.draftOrderCreate;
        const userErrors = result.userErrors || [];
        if (userErrors.length > 0) {
            const firstError = userErrors[0];
            if (!firstError) {
                throw new nango.ActionError({
                    type: 'shopify_error',
                    message: 'Shopify returned an error'
                });
            }
            throw new nango.ActionError({
                type: 'shopify_error',
                message: firstError.message || 'Shopify returned an error',
                field: firstError.field || undefined
            });
        }

        if (!result.draftOrder) {
            throw new nango.ActionError({
                type: 'not_created',
                message: 'Draft order was not created'
            });
        }

        const order = result.draftOrder;
        return {
            id: order.id,
            ...(order.name != null && { name: order.name }),
            ...(order.status != null && { status: order.status }),
            ...(order.email != null && { email: order.email }),
            ...(order.note2 != null && { note2: order.note2 }),
            ...(order.tags != null && { tags: order.tags }),
            ...(order.taxExempt != null && { taxExempt: order.taxExempt }),
            ...(order.presentmentCurrencyCode != null && { presentmentCurrencyCode: order.presentmentCurrencyCode }),
            ...(order.createdAt != null && { createdAt: order.createdAt }),
            ...(order.updatedAt != null && { updatedAt: order.updatedAt }),
            ...(order.customer != null && { customer: order.customer }),
            ...(order.purchasingEntity != null && {
                purchasingEntity: {
                    ...(order.purchasingEntity.customer != null && { customer: order.purchasingEntity.customer }),
                    ...(order.purchasingEntity.company != null && { company: order.purchasingEntity.company }),
                    ...(order.purchasingEntity.contact != null && { contact: order.purchasingEntity.contact }),
                    ...(order.purchasingEntity.location != null && { location: order.purchasingEntity.location })
                }
            }),
            ...(order.shippingAddress != null && { shippingAddress: order.shippingAddress }),
            ...(order.billingAddress != null && { billingAddress: order.billingAddress }),
            ...(order.lineItems?.edges != null && {
                lineItems: order.lineItems.edges.map((edge) => {
                    const item = edge.node;
                    return {
                        ...(item.id != null && { id: item.id }),
                        ...(item.title != null && { title: item.title }),
                        ...(item.quantity != null && { quantity: item.quantity }),
                        ...(item.custom != null && { custom: item.custom }),
                        ...(item.variant != null && { variant: item.variant }),
                        ...(item.originalUnitPriceSet != null && { originalUnitPriceSet: item.originalUnitPriceSet })
                    };
                })
            }),
            ...(order.appliedDiscount != null && { appliedDiscount: order.appliedDiscount }),
            ...(order.totalPriceSet != null && { totalPriceSet: order.totalPriceSet })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
