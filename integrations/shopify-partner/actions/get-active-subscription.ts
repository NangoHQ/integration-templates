import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('Shopify app GID using the shopify namespace. Example: "gid://shopify/App/1234567890"'),
    shopId: z.string().describe('Shopify shop GID using the shopify namespace. Example: "gid://shopify/Shop/1234567890"')
});

const AppReferenceSchema = z.object({
    apiKey: z.string(),
    id: z.string(),
    name: z.string()
});

const ShopReferenceSchema = z.object({
    id: z.string(),
    myshopifyDomain: z.string(),
    name: z.string()
});

const BillingCycleSchema = z.object({
    endTime: z.string(),
    startTime: z.string()
});

const MoneySchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const SubscriptionDiscountSchema = z.object({
    amount: z.string().nullable().optional(),
    discountEndsAt: z.string().nullable().optional(),
    originalDiscountCycles: z.number().nullable().optional(),
    percentage: z.number().nullable().optional(),
    remainingDiscountCycles: z.number().nullable().optional()
});

const PriceTierSchema = z.object({
    amount: z.string(),
    amountPerUnit: z.string(),
    upTo: z.number().nullable().optional()
});

const PriceSchema = z.object({
    active: z.boolean(),
    currency: z.string(),
    amount: z.string().optional(),
    tiers: z.array(PriceTierSchema).optional(),
    tiersMode: z.string().optional()
});

const UsageSchema = z.object({
    cost: MoneySchema,
    quantity: z.number()
});

const SubscriptionItemSchema = z.object({
    description: z.string().nullable().optional(),
    discount: SubscriptionDiscountSchema.nullable().optional(),
    handle: z.string().nullable().optional(),
    price: PriceSchema,
    usage: UsageSchema.nullable().optional()
});

const PendingUpdateSchema = z.object({
    billingPeriod: z.string(),
    items: z.array(SubscriptionItemSchema),
    legacySubscriptionId: z.string().nullable().optional()
});

const ActiveSubscriptionSchema = z.object({
    app: AppReferenceSchema,
    billingPeriod: z.string(),
    cancelAtEndOfCycle: z.boolean(),
    currentBillingCycle: BillingCycleSchema.nullable().optional(),
    items: z.array(SubscriptionItemSchema),
    legacySubscriptionId: z.string().nullable().optional(),
    pendingUpdate: PendingUpdateSchema.nullable().optional(),
    shop: ShopReferenceSchema,
    trialEndsAt: z.string().nullable().optional()
});

const OutputSchema = ActiveSubscriptionSchema.nullable();

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.record(z.string(), z.unknown()).optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            activeSubscription: ActiveSubscriptionSchema.nullable().optional()
        })
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'Retrieve the active recurring/usage subscription for an app on a shop.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_apps', 'read_shopify_payments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://shopify.dev/docs/api/partner/latest/queries/activeSubscription
        const response = await nango.post({
            endpoint: '2026-07/graphql.json',
            data: {
                query: `query GetActiveSubscription($appId: ID!, $shopId: ID!) {
                    activeSubscription(appId: $appId, shopId: $shopId) {
                        app {
                            apiKey
                            id
                            name
                        }
                        billingPeriod
                        cancelAtEndOfCycle
                        currentBillingCycle {
                            endTime
                            startTime
                        }
                        items {
                            description
                            discount {
                                amount
                                discountEndsAt
                                originalDiscountCycles
                                percentage
                                remainingDiscountCycles
                            }
                            handle
                            price {
                                active
                                currency
                                ... on FlatRatePrice {
                                    amount
                                }
                                ... on TieredPrice {
                                    tiers {
                                        amount
                                        amountPerUnit
                                        upTo
                                    }
                                    tiersMode
                                }
                            }
                            usage {
                                cost {
                                    amount
                                    currencyCode
                                }
                                quantity
                            }
                        }
                        legacySubscriptionId
                        pendingUpdate {
                            billingPeriod
                            items {
                                description
                                discount {
                                    amount
                                    discountEndsAt
                                    originalDiscountCycles
                                    percentage
                                    remainingDiscountCycles
                                }
                                handle
                                price {
                                    active
                                    currency
                                    ... on FlatRatePrice {
                                        amount
                                    }
                                    ... on TieredPrice {
                                        tiers {
                                            amount
                                            amountPerUnit
                                            upTo
                                        }
                                        tiersMode
                                    }
                                }
                                usage {
                                    cost {
                                        amount
                                        currencyCode
                                    }
                                    quantity
                                }
                            }
                            legacySubscriptionId
                        }
                        shop {
                            id
                            myshopifyDomain
                            name
                        }
                        trialEndsAt
                    }
                }`,
                variables: {
                    appId: input.appId,
                    shopId: input.shopId
                }
            },
            retries: 3
        });

        const result = GraphQLResponseSchema.safeParse(response.data);
        if (!result.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: `Unexpected response shape from the Partner API: ${result.error.message}`
            });
        }

        const payload = result.data;

        const errors = payload.errors;
        const firstError = errors?.[0];
        if (firstError) {
            if (errors.length === 1 && firstError.message === 'App not found') {
                return null;
            }
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError.message,
                errors: errors?.map((e) => e.message) ?? []
            });
        }

        const activeSubscription = payload.data?.activeSubscription ?? null;

        if (!activeSubscription) {
            return null;
        }

        return {
            app: activeSubscription.app,
            billingPeriod: activeSubscription.billingPeriod,
            cancelAtEndOfCycle: activeSubscription.cancelAtEndOfCycle,
            ...(activeSubscription.currentBillingCycle !== undefined && { currentBillingCycle: activeSubscription.currentBillingCycle }),
            items: activeSubscription.items,
            ...(activeSubscription.legacySubscriptionId !== undefined && { legacySubscriptionId: activeSubscription.legacySubscriptionId }),
            ...(activeSubscription.pendingUpdate !== undefined && { pendingUpdate: activeSubscription.pendingUpdate }),
            shop: activeSubscription.shop,
            ...(activeSubscription.trialEndsAt !== undefined && { trialEndsAt: activeSubscription.trialEndsAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
