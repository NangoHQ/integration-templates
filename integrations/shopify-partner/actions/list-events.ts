import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const EventTypeEnum = z.enum([
    'CHARGE_ONE_TIME',
    'CHARGE_RECURRING',
    'CHARGE_USAGE',
    'CREDIT_APPLIED',
    'CREDIT_FAILED',
    'CREDIT_PENDING',
    'EARNING_ADJUSTMENT',
    'EARNING_CHARGE_ONE_TIME',
    'EARNING_CHARGE_RECURRING',
    'EARNING_CHARGE_USAGE',
    'EARNING_CREDIT',
    'EARNING_REFUND',
    'RELATIONSHIP_DEACTIVATED',
    'RELATIONSHIP_INSTALLED',
    'RELATIONSHIP_REACTIVATED',
    'RELATIONSHIP_UNINSTALLED',
    'SUBSCRIPTION_CANCELED',
    'SUBSCRIPTION_CANCELLATION_SCHEDULED',
    'SUBSCRIPTION_CREATED',
    'SUBSCRIPTION_FROZEN',
    'SUBSCRIPTION_UNFROZEN',
    'SUBSCRIPTION_UPDATED'
]);

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(250).optional().describe('Maximum number of events to return. Defaults to 50.'),
    shopId: z.string().optional().describe('Filter by shop ID. Must be a GID in the format gid://shopify/Shop/{id}.'),
    subjectType: z.enum(['APP', 'THEME']).optional().describe('Filter by subject type.'),
    subjectId: z.string().optional().describe('Filter by subject ID. Must be a GID in the format gid://shopify/App/{id} or gid://shopify/Theme/{id}.'),
    eventTypes: z.array(EventTypeEnum).optional().describe('Filter by one or more event types.'),
    occurredAtMin: z.string().optional().describe('Filter events that occurred on or after this ISO 8601 datetime.'),
    occurredAtMax: z.string().optional().describe('Filter events that occurred on or before this ISO 8601 datetime.'),
    orderBy: z.enum(['OCCURRED_AT_ASC', 'OCCURRED_AT_DESC']).optional().describe('Order direction for event results.')
});

const ShopReferenceSchema = z
    .object({
        id: z.string(),
        myshopifyDomain: z.string(),
        name: z.string()
    })
    .nullable()
    .optional();

const SubjectSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        apiKey: z.string().optional()
    })
    .nullable()
    .optional();

const PartnerEventSchema = z
    .object({
        id: z.string(),
        eventType: z.string(),
        occurredAt: z.string(),
        shop: ShopReferenceSchema,
        subject: SubjectSchema
    })
    .passthrough();

const OutputSchema = z.object({
    events: z.array(PartnerEventSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Partner account events across apps and shops with filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_partner_events'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filter: {
            shopId?: string;
            subjectType?: 'APP' | 'THEME';
            subjectId?: string;
            eventTypes?: string[];
            occurredAtMin?: string;
            occurredAtMax?: string;
        } = {};

        if (input.shopId !== undefined) {
            filter.shopId = input.shopId;
        }
        if (input.subjectType !== undefined) {
            filter.subjectType = input.subjectType;
        }
        if (input.subjectId !== undefined) {
            filter.subjectId = input.subjectId;
        }
        if (input.eventTypes !== undefined && input.eventTypes.length > 0) {
            filter.eventTypes = input.eventTypes;
        }
        if (input.occurredAtMin !== undefined) {
            filter.occurredAtMin = input.occurredAtMin;
        }
        if (input.occurredAtMax !== undefined) {
            filter.occurredAtMax = input.occurredAtMax;
        }

        const variables: {
            first: number;
            after?: string;
            filter?: typeof filter;
            orderBy?: 'OCCURRED_AT_ASC' | 'OCCURRED_AT_DESC';
        } = {
            first: input.limit ?? 50
        };

        if (input.cursor !== undefined) {
            variables.after = input.cursor;
        }
        if (Object.keys(filter).length > 0) {
            variables.filter = filter;
        }
        if (input.orderBy !== undefined) {
            variables.orderBy = input.orderBy;
        }

        const query = `
            query ($first: Int, $after: String, $filter: EventFilterInput, $orderBy: EventOrder) {
                events(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                    edges {
                        cursor
                        node {
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
                                    id
                                    name
                                    apiKey
                                }
                                ... on ThemeReference {
                                    id
                                    name
                                }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/partner/latest/queries/events
            endpoint: '2026-07/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        const rawBodySchema = z.object({
            data: z.unknown().optional(),
            errors: z.array(z.unknown()).optional()
        });

        const rawBody = rawBodySchema.parse(response.data);

        if (rawBody.errors !== undefined && rawBody.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'The Shopify Partner API returned GraphQL errors.',
                errors: rawBody.errors
            });
        }

        const dataSchema = z.object({
            data: z.object({
                events: z.object({
                    edges: z.array(
                        z.object({
                            cursor: z.string(),
                            node: z.unknown()
                        })
                    ),
                    pageInfo: z.object({
                        hasNextPage: z.boolean(),
                        endCursor: z.string().nullable().optional()
                    })
                })
            })
        });

        const parsed = dataSchema.parse(rawBody);
        const events = parsed.data.events.edges.map((edge) => PartnerEventSchema.parse(edge.node));

        return {
            events,
            ...(parsed.data.events.pageInfo.endCursor != null && {
                nextCursor: parsed.data.events.pageInfo.endCursor
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
