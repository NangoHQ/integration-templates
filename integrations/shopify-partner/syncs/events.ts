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

// Shopify's `events` filter defaults occurredAtMax to occurredAtMin + 30 days (or now) whenever
// only one bound is supplied, and rejects any explicit range over 365 days (verified against the
// live API). Both bounds are therefore always supplied explicitly, and the window is advanced
// after every page even when it produced zero edges, so a run can neither silently limit itself to
// the last 30 days nor stall forever on an empty window.
const WINDOW_MS = 365 * 24 * 60 * 60 * 1000;
// Predates the Shopify Partner program; a safe floor for a full-history backfill.
const BACKFILL_FLOOR = '2006-01-01T00:00:00.000Z';
// Bounds how many windows one execution will walk through, so a long backfill can't run past the
// sync's execution time limit; any remaining windows resume on the next scheduled run.
const MAX_WINDOWS_PER_RUN = 50;

const CheckpointSchema = z.object({
    windowStart: z.string(),
    windowEnd: z.string(),
    cursor: z.string(),
    // Distinguishes "this window has been fully paginated, waiting for real time to advance past
    // it" from "not started yet" -- both of which would otherwise look like cursor: ''.
    windowDrained: z.boolean()
});

function clampWindowEnd(windowStart: string, now: Date): string {
    const end = Math.min(new Date(windowStart).getTime() + WINDOW_MS, now.getTime());
    return new Date(end).toISOString();
}

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

        let windowStart = checkpoint?.['windowStart'] || BACKFILL_FLOOR;
        let windowEnd = checkpoint?.['windowEnd'] || clampWindowEnd(windowStart, new Date());
        let cursor = checkpoint?.['cursor'] || undefined;
        let windowDrained = checkpoint?.['windowDrained'] ?? false;

        const query = `
            query Events($first: Int!, $after: String, $occurredAtMin: DateTime, $occurredAtMax: DateTime) {
                events(first: $first, after: $after, filter: { occurredAtMin: $occurredAtMin, occurredAtMax: $occurredAtMax }, orderBy: OCCURRED_AT_ASC) {
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

        let windowsProcessed = 0;

        while (windowsProcessed < MAX_WINDOWS_PER_RUN) {
            let hasNextPage = !windowDrained;

            while (hasNextPage) {
                // https://shopify.dev/docs/api/partner/latest/queries/events
                const response = await nango.post({
                    endpoint: '2026-07/graphql.json',
                    data: {
                        query,
                        variables: {
                            first: 50,
                            after: cursor,
                            occurredAtMin: windowStart,
                            occurredAtMax: windowEnd
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
                cursor = parsedResponse.data.data.events.pageInfo.endCursor ?? undefined;

                if (hasNextPage && typeof cursor !== 'string') {
                    throw new Error('hasNextPage is true but endCursor is missing');
                }

                const events: z.infer<typeof EventSchema>[] = [];

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
                }

                if (events.length > 0) {
                    await nango.batchSave(events, 'Event');
                }

                windowDrained = !hasNextPage;
                await nango.saveCheckpoint({
                    windowStart,
                    windowEnd,
                    cursor: hasNextPage ? (cursor ?? '') : '',
                    windowDrained
                });
            }

            windowsProcessed++;

            const now = new Date();
            // occurredAtMax is inclusive, so the next window starts 1ms after this one ended --
            // otherwise the boundary event would be refetched (and rechecked) on every window.
            const nextWindowStart = new Date(new Date(windowEnd).getTime() + 1).toISOString();
            if (new Date(nextWindowStart).getTime() > now.getTime()) {
                // Caught up to the current watermark. Stop here rather than open a window that
                // starts in the future; the next scheduled run will pick up once real time has
                // advanced past it.
                break;
            }

            windowStart = nextWindowStart;
            windowEnd = clampWindowEnd(windowStart, now);
            cursor = undefined;
            windowDrained = false;
            await nango.saveCheckpoint({ windowStart, windowEnd, cursor: '', windowDrained });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
