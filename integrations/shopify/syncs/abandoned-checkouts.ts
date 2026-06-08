import { createSync } from 'nango';
import { z } from 'zod';

const MoneySchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const MoneyBagSchema = z.object({
    shopMoney: MoneySchema
});

const LineItemSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    quantity: z.number(),
    sku: z.string().nullable().optional(),
    originalUnitPriceSet: MoneyBagSchema.nullable().optional()
});

const CustomerSchema = z.object({
    id: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const AddressSchema = z.object({
    country: z.string().nullable().optional()
});

const ProviderAbandonedCheckoutSchema = z.object({
    id: z.string(),
    name: z.string(),
    abandonedCheckoutUrl: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().nullable().optional(),
    customer: CustomerSchema.nullable().optional(),
    billingAddress: AddressSchema.nullable().optional(),
    shippingAddress: AddressSchema.nullable().optional(),
    lineItems: z
        .object({
            nodes: z.array(LineItemSchema)
        })
        .nullable()
        .optional(),
    totalPriceSet: MoneyBagSchema.nullable().optional(),
    subtotalPriceSet: MoneyBagSchema.nullable().optional(),
    discountCodes: z.array(z.string())
});

const GraphQLResponseSchema = z.object({
    data: z.unknown().optional(),
    errors: z.array(z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    abandonedCheckouts: z.object({
        nodes: z.array(ProviderAbandonedCheckoutSchema),
        pageInfo: z.object({
            hasNextPage: z.boolean(),
            endCursor: z.string().nullable().optional()
        })
    })
});

const AbandonedCheckoutSchema = z.object({
    id: z.string(),
    name: z.string(),
    abandonedCheckoutUrl: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().optional(),
    customerEmail: z.string().optional(),
    customerFirstName: z.string().optional(),
    customerLastName: z.string().optional(),
    billingAddressCountry: z.string().optional(),
    shippingAddressCountry: z.string().optional(),
    lineItems: z
        .array(
            z.object({
                id: z.string(),
                title: z.string().optional(),
                quantity: z.number(),
                sku: z.string().optional(),
                originalUnitPrice: z.number().optional(),
                originalUnitPriceCurrency: z.string().optional()
            })
        )
        .optional(),
    totalPrice: z.number().optional(),
    totalPriceCurrency: z.string().optional(),
    subtotalPrice: z.number().optional(),
    subtotalPriceCurrency: z.string().optional(),
    discountCodes: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify abandoned checkouts for retargeting workflows.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        AbandonedCheckout: AbandonedCheckoutSchema
    },
    endpoints: [
        {
            path: '/syncs/abandoned-checkouts',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { updated_after: '', cursor: '' });
        const updatedAfter = checkpoint.updated_after || undefined;
        let cursor = checkpoint.cursor || undefined;

        const limit = 50;
        let hasNextPage = true;
        let maxUpdatedAt: string | undefined;

        while (hasNextPage) {
            const queryFilter = updatedAfter ? `updated_at:>"${updatedAfter}"` : undefined;

            // https://shopify.dev/docs/api/admin-graphql/2025-10/queries/abandonedCheckouts
            const response = await nango.post({
                endpoint: '/admin/api/2025-10/graphql.json',
                data: {
                    query: `
                        query AbandonedCheckouts($first: Int!, $after: String, $query: String) {
                            abandonedCheckouts(first: $first, after: $after, query: $query, sortKey: ID) {
                                nodes {
                                    id
                                    name
                                    abandonedCheckoutUrl
                                    createdAt
                                    updatedAt
                                    completedAt
                                    customer {
                                        id
                                        firstName
                                        lastName
                                        email
                                    }
                                    billingAddress {
                                        country
                                    }
                                    shippingAddress {
                                        country
                                    }
                                    lineItems(first: 100) {
                                        nodes {
                                            id
                                            title
                                            quantity
                                            sku
                                            originalUnitPriceSet {
                                                shopMoney {
                                                    amount
                                                    currencyCode
                                                }
                                            }
                                        }
                                    }
                                    totalPriceSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    subtotalPriceSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    discountCodes
                                }
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                            }
                        }
                    `,
                    variables: {
                        first: limit,
                        after: cursor,
                        query: queryFilter
                    }
                },
                retries: 3
            });

            const rawResponse = GraphQLResponseSchema.parse(response.data);

            if (rawResponse.errors && rawResponse.errors.length > 0) {
                throw new Error(`GraphQL errors: ${JSON.stringify(rawResponse.errors)}`);
            }

            if (rawResponse.data == null) {
                throw new Error(`Unexpected GraphQL response: data is ${JSON.stringify(rawResponse.data)}. Full response: ${JSON.stringify(response.data)}`);
            }

            const parsed = ProviderResponseSchema.safeParse(rawResponse.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse abandoned checkouts response: ${parsed.error.message}. Raw data: ${JSON.stringify(rawResponse.data)}`);
            }

            const { nodes, pageInfo } = parsed.data.abandonedCheckouts;

            const checkouts = nodes.map((node) => {
                const lineItems =
                    node.lineItems?.nodes.map((item) => ({
                        id: item.id,
                        ...(item.title != null && { title: item.title }),
                        quantity: item.quantity,
                        ...(item.sku != null && { sku: item.sku }),
                        ...(item.originalUnitPriceSet?.shopMoney.amount != null && {
                            originalUnitPrice: Number(item.originalUnitPriceSet.shopMoney.amount)
                        }),
                        ...(item.originalUnitPriceSet?.shopMoney.currencyCode != null && {
                            originalUnitPriceCurrency: item.originalUnitPriceSet.shopMoney.currencyCode
                        })
                    })) ?? [];

                return {
                    id: node.id,
                    name: node.name,
                    abandonedCheckoutUrl: node.abandonedCheckoutUrl,
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                    ...(node.completedAt != null && { completedAt: node.completedAt }),
                    ...(node.customer?.email != null && { customerEmail: node.customer.email }),
                    ...(node.customer?.firstName != null && { customerFirstName: node.customer.firstName }),
                    ...(node.customer?.lastName != null && { customerLastName: node.customer.lastName }),
                    ...(node.billingAddress?.country != null && { billingAddressCountry: node.billingAddress.country }),
                    ...(node.shippingAddress?.country != null && { shippingAddressCountry: node.shippingAddress.country }),
                    ...(lineItems.length > 0 && { lineItems }),
                    ...(node.totalPriceSet?.shopMoney.amount != null && {
                        totalPrice: Number(node.totalPriceSet.shopMoney.amount)
                    }),
                    ...(node.totalPriceSet?.shopMoney.currencyCode != null && {
                        totalPriceCurrency: node.totalPriceSet.shopMoney.currencyCode
                    }),
                    ...(node.subtotalPriceSet?.shopMoney.amount != null && {
                        subtotalPrice: Number(node.subtotalPriceSet.shopMoney.amount)
                    }),
                    ...(node.subtotalPriceSet?.shopMoney.currencyCode != null && {
                        subtotalPriceCurrency: node.subtotalPriceSet.shopMoney.currencyCode
                    }),
                    ...(node.discountCodes.length > 0 && { discountCodes: node.discountCodes })
                };
            });

            if (checkouts.length > 0) {
                await nango.batchSave(checkouts, 'AbandonedCheckout');
                for (const checkout of checkouts) {
                    if (maxUpdatedAt === undefined || checkout.updatedAt > maxUpdatedAt) {
                        maxUpdatedAt = checkout.updatedAt;
                    }
                }
            }

            hasNextPage = pageInfo.hasNextPage;
            cursor = pageInfo.endCursor ?? undefined;

            if (hasNextPage && cursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    cursor
                });
            }
        }

        if (maxUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt, cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
