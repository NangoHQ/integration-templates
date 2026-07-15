import { createSync } from 'nango';
import { z } from 'zod';

const MoneySchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const ShopSchema = z.object({
    id: z.string(),
    myshopifyDomain: z.string(),
    name: z.string()
});

const AppReferenceSchema = z.object({
    __typename: z.literal('AppReference'),
    id: z.string(),
    name: z.string(),
    apiKey: z.string().optional()
});

const ThemeReferenceSchema = z.object({
    __typename: z.literal('ThemeReference'),
    id: z.string(),
    name: z.string()
});

const SubjectSchema = z.union([AppReferenceSchema, ThemeReferenceSchema]);

const EventMetadataSchema = z.object({
    legacyChargeId: z.string()
});

const ChargeSchema = z.object({
    __typename: z.literal('Charge'),
    id: z.string(),
    eventType: z.string(),
    occurredAt: z.string(),
    shop: ShopSchema.nullable().optional(),
    subject: SubjectSchema.nullable().optional(),
    chargeId: z.string(),
    chargeType: z.string(),
    amount: MoneySchema,
    balanceUsed: z.string().nullable().optional(),
    cappedAmount: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    planHandle: z.string().nullable().optional(),
    usageQuantity: z.string().nullable().optional(),
    metadata: EventMetadataSchema.nullable().optional()
});

const CreditSchema = z.object({
    __typename: z.literal('Credit'),
    id: z.string(),
    eventType: z.string(),
    occurredAt: z.string(),
    shop: ShopSchema.nullable().optional(),
    subject: SubjectSchema.nullable().optional(),
    description: z.string().nullable().optional(),
    money: MoneySchema,
    status: z.string()
});

const EarningSchema = z.object({
    __typename: z.literal('Earning'),
    id: z.string(),
    eventType: z.string(),
    occurredAt: z.string(),
    shop: ShopSchema.nullable().optional(),
    subject: SubjectSchema.nullable().optional(),
    chargeId: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    earningType: z.string(),
    grossAmount: MoneySchema,
    netAmount: MoneySchema,
    settlementDate: z.string().nullable().optional(),
    shopifyFee: MoneySchema,
    metadata: EventMetadataSchema.nullable().optional()
});

const PlanSchema = z.object({
    billingPeriod: z.string().nullable().optional(),
    handle: z.string().nullable().optional(),
    trialDays: z.number().nullable().optional(),
    trialDaysRemaining: z.number().nullable().optional()
});

const RelationshipSchema = z.object({
    __typename: z.literal('Relationship'),
    id: z.string(),
    eventType: z.string(),
    occurredAt: z.string(),
    shop: ShopSchema.nullable().optional(),
    subject: SubjectSchema.nullable().optional(),
    reason: z.string().nullable().optional(),
    reasonDescription: z.string().nullable().optional(),
    state: z.string()
});

const SubscriptionStatusSchema = z.object({
    __typename: z.literal('SubscriptionStatus'),
    id: z.string(),
    eventType: z.string(),
    occurredAt: z.string(),
    shop: ShopSchema.nullable().optional(),
    subject: SubjectSchema.nullable().optional(),
    cancelEffectiveOn: z.string().nullable().optional(),
    plan: PlanSchema.nullable().optional(),
    state: z.string()
});

const EventNodeSchema = z.discriminatedUnion('__typename', [ChargeSchema, CreditSchema, EarningSchema, RelationshipSchema, SubscriptionStatusSchema]);

const EdgeSchema = z.object({
    node: EventNodeSchema,
    cursor: z.string()
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.unknown().optional()
});

const EventsResponseSchema = z.object({
    data: z.object({
        events: z.object({
            edges: z.array(EdgeSchema),
            pageInfo: z.object({
                hasNextPage: z.boolean(),
                endCursor: z.string().nullable().optional()
            })
        })
    }),
    errors: z.array(GraphQLErrorSchema).optional()
});

const EventSchema = z.object({
    id: z.string(),
    eventType: z.string(),
    occurredAt: z.string(),
    shopId: z.string().optional(),
    shopMyshopifyDomain: z.string().optional(),
    shopName: z.string().optional(),
    subjectId: z.string().optional(),
    subjectName: z.string().optional(),
    subjectType: z.string().optional(),
    chargeId: z.string().optional(),
    chargeType: z.string().optional(),
    amount: MoneySchema.optional(),
    balanceUsed: z.string().optional(),
    cappedAmount: z.string().optional(),
    description: z.string().optional(),
    planHandle: z.string().optional(),
    usageQuantity: z.string().optional(),
    metadataLegacyChargeId: z.string().optional(),
    creditMoney: MoneySchema.optional(),
    creditStatus: z.string().optional(),
    earningType: z.string().optional(),
    grossAmount: MoneySchema.optional(),
    netAmount: MoneySchema.optional(),
    settlementDate: z.string().optional(),
    shopifyFee: MoneySchema.optional(),
    reason: z.string().optional(),
    reasonDescription: z.string().optional(),
    relationshipState: z.string().optional(),
    subscriptionState: z.string().optional(),
    cancelEffectiveOn: z.string().optional(),
    planBillingPeriod: z.string().optional(),
    planTrialDays: z.number().optional(),
    planTrialDaysRemaining: z.number().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string(),
    occurredAtMin: z.string()
});

const sync = createSync({
    description: 'Sync Partner account events (installs, charges, credits, earnings, subscription status changes).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // Keep the timestamp filter stable during pagination so a saved cursor
        // always matches the query window that produced it.
        const resumeOccurredAtMin = checkpoint?.['occurredAtMin'] || undefined;
        let after = checkpoint?.['cursor'] || undefined;
        let maxOccurredAtSeen = resumeOccurredAtMin;
        let hasNextPage = true;

        const query = `
            query Events($first: Int!, $after: String, $occurredAtMin: DateTime) {
                events(first: $first, after: $after, filter: { occurredAtMin: $occurredAtMin }, orderBy: OCCURRED_AT_ASC) {
                    edges {
                        node {
                            __typename
                            id
                            eventType
                            occurredAt
                            shop {
                                id
                                myshopifyDomain
                                name
                            }
                            subject {
                                ... on AppReference {
                                    __typename
                                    id
                                    name
                                    apiKey
                                }
                                ... on ThemeReference {
                                    __typename
                                    id
                                    name
                                }
                            }
                            ... on Charge {
                                chargeId
                                chargeType
                                amount {
                                    amount
                                    currencyCode
                                }
                                balanceUsed
                                cappedAmount
                                description
                                planHandle
                                usageQuantity
                                metadata {
                                    legacyChargeId
                                }
                            }
                            ... on Credit {
                                description
                                money {
                                    amount
                                    currencyCode
                                }
                                status
                            }
                            ... on Earning {
                                chargeId
                                description
                                earningType
                                grossAmount {
                                    amount
                                    currencyCode
                                }
                                netAmount {
                                    amount
                                    currencyCode
                                }
                                settlementDate
                                shopifyFee {
                                    amount
                                    currencyCode
                                }
                                metadata {
                                    legacyChargeId
                                }
                            }
                            ... on Relationship {
                                reason
                                reasonDescription
                                state
                            }
                            ... on SubscriptionStatus {
                                cancelEffectiveOn
                                state
                                plan {
                                    billingPeriod
                                    handle
                                    trialDays
                                    trialDaysRemaining
                                }
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        while (hasNextPage) {
            // https://shopify.dev/docs/api/partner/latest/queries/events
            const response = await nango.post({
                endpoint: '2026-07/graphql.json',
                data: {
                    query,
                    variables: {
                        first: 5,
                        after,
                        ...(resumeOccurredAtMin && { occurredAtMin: resumeOccurredAtMin })
                    }
                },
                retries: 3
            });

            const parsedResponse = EventsResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error('Unexpected events response shape');
            }

            if (parsedResponse.data.errors && parsedResponse.data.errors.length > 0) {
                throw new Error(`GraphQL errors: ${parsedResponse.data.errors.map((e) => e.message).join(', ')}`);
            }

            const edges = parsedResponse.data.data.events.edges;
            hasNextPage = parsedResponse.data.data.events.pageInfo.hasNextPage;
            after = parsedResponse.data.data.events.pageInfo.endCursor ?? undefined;

            if (hasNextPage && typeof after !== 'string') {
                throw new Error('hasNextPage is true but endCursor is missing');
            }

            const events: z.infer<typeof EventSchema>[] = [];
            let batchMaxOccurredAt: string | undefined;

            for (const edge of edges) {
                const node = edge.node;
                const shop = node.shop ?? null;
                const subject = node.subject ?? null;

                const base: z.infer<typeof EventSchema> = {
                    id: node.id,
                    eventType: node.eventType,
                    occurredAt: node.occurredAt,
                    ...(shop && {
                        shopId: shop.id,
                        shopMyshopifyDomain: shop.myshopifyDomain,
                        shopName: shop.name
                    }),
                    ...(subject && {
                        subjectId: subject.id,
                        subjectName: subject.name,
                        subjectType: subject.__typename
                    })
                };

                let event: z.infer<typeof EventSchema>;

                if (node.__typename === 'Charge') {
                    event = {
                        ...base,
                        chargeId: node.chargeId,
                        chargeType: node.chargeType,
                        amount: node.amount,
                        ...(node.balanceUsed != null && { balanceUsed: node.balanceUsed }),
                        ...(node.cappedAmount != null && { cappedAmount: node.cappedAmount }),
                        ...(node.description != null && { description: node.description }),
                        ...(node.planHandle != null && { planHandle: node.planHandle }),
                        ...(node.usageQuantity != null && { usageQuantity: node.usageQuantity }),
                        ...(node.metadata != null && { metadataLegacyChargeId: node.metadata.legacyChargeId })
                    };
                } else if (node.__typename === 'Credit') {
                    event = {
                        ...base,
                        ...(node.description != null && { description: node.description }),
                        creditMoney: node.money,
                        creditStatus: node.status
                    };
                } else if (node.__typename === 'Earning') {
                    event = {
                        ...base,
                        ...(node.chargeId != null && { chargeId: node.chargeId }),
                        ...(node.description != null && { description: node.description }),
                        earningType: node.earningType,
                        grossAmount: node.grossAmount,
                        netAmount: node.netAmount,
                        ...(node.settlementDate != null && { settlementDate: node.settlementDate }),
                        shopifyFee: node.shopifyFee,
                        ...(node.metadata != null && { metadataLegacyChargeId: node.metadata.legacyChargeId })
                    };
                } else if (node.__typename === 'Relationship') {
                    event = {
                        ...base,
                        ...(node.reason != null && { reason: node.reason }),
                        ...(node.reasonDescription != null && { reasonDescription: node.reasonDescription }),
                        relationshipState: node.state
                    };
                } else if (node.__typename === 'SubscriptionStatus') {
                    event = {
                        ...base,
                        ...(node.cancelEffectiveOn != null && { cancelEffectiveOn: node.cancelEffectiveOn }),
                        subscriptionState: node.state,
                        ...(node.plan != null && {
                            planBillingPeriod: node.plan.billingPeriod ?? undefined,
                            planHandle: node.plan.handle ?? undefined,
                            planTrialDays: node.plan.trialDays ?? undefined,
                            planTrialDaysRemaining: node.plan.trialDaysRemaining ?? undefined
                        })
                    };
                } else {
                    throw new Error(`Unhandled event type: ${JSON.stringify(node)}`);
                }

                events.push(event);

                if (!batchMaxOccurredAt || node.occurredAt > batchMaxOccurredAt) {
                    batchMaxOccurredAt = node.occurredAt;
                }
            }

            if (events.length > 0) {
                await nango.batchSave(events, 'Event');
            }

            if (batchMaxOccurredAt && (!maxOccurredAtSeen || batchMaxOccurredAt > maxOccurredAtSeen)) {
                maxOccurredAtSeen = batchMaxOccurredAt;
            }

            if (hasNextPage) {
                await nango.saveCheckpoint({
                    cursor: after ?? '',
                    occurredAtMin: resumeOccurredAtMin ?? ''
                });
            }
        }

        if (maxOccurredAtSeen) {
            await nango.saveCheckpoint({
                cursor: '',
                occurredAtMin: maxOccurredAtSeen
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
