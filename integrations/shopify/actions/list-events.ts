import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of events to return. Max 250. Default: 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous response.'),
    sortKey: z.enum(['ID', 'CREATED_AT']).optional().describe('Sort key for events. Default: ID.'),
    reverse: z.boolean().optional().describe('Reverse the order of the results. Default: false.'),
    query: z.string().optional().describe('Search query string for filtering events.'),
    subjectType: z.string().optional().describe('Filter by subject type. Example: PRODUCT, ORDER, COLLECTION.')
});

const EventSchema = z.object({
    id: z.string(),
    action: z.string(),
    appTitle: z.string().nullable().optional(),
    attributeToApp: z.boolean(),
    attributeToUser: z.boolean(),
    createdAt: z.string(),
    criticalAlert: z.boolean(),
    message: z.string(),
    arguments: z.array(z.unknown()).optional(),
    subjectId: z.string().optional(),
    subjectType: z.string().optional(),
    additionalContent: z.string().nullable().optional()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const EdgeSchema = z.object({
    cursor: z.string(),
    node: z.unknown()
});

const EventsConnectionSchema = z.object({
    edges: z.array(EdgeSchema),
    pageInfo: PageInfoSchema
});

const GraphQlResponseSchema = z.object({
    data: z.object({
        events: EventsConnectionSchema
    })
});

const OutputSchema = z.object({
    events: z.array(EventSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify store events for the activity feed.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const first = input.first ?? 50;

        const filterParts: string[] = [];
        if (input.query) {
            filterParts.push(input.query);
        }
        if (input.subjectType) {
            filterParts.push(`subject_type:'${input.subjectType}'`);
        }
        const queryString = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

        const variables: Record<string, unknown> = {
            first
        };
        if (input.after !== undefined) {
            variables['after'] = input.after;
        }
        if (input.sortKey !== undefined) {
            variables['sortKey'] = input.sortKey;
        }
        if (input.reverse !== undefined) {
            variables['reverse'] = input.reverse;
        }
        if (queryString !== undefined) {
            variables['query'] = queryString;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/events
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: `
                    query ListEvents($first: Int!, $after: String, $sortKey: EventSortKeys, $reverse: Boolean, $query: String) {
                        events(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
                            edges {
                                cursor
                                node {
                                    id
                                    action
                                    appTitle
                                    attributeToApp
                                    attributeToUser
                                    createdAt
                                    criticalAlert
                                    message
                                    ... on BasicEvent {
                                        arguments
                                        subjectId
                                        subjectType
                                        additionalContent
                                    }
                                }
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables
            },
            retries: 3
        });

        const parsed = GraphQlResponseSchema.parse(response.data);
        const eventsConnection = parsed.data.events;

        const events = eventsConnection.edges.map((edge) => {
            const parsedNode = EventSchema.parse(edge.node);
            return {
                id: parsedNode.id,
                action: parsedNode.action,
                ...(parsedNode.appTitle != null && { appTitle: parsedNode.appTitle }),
                attributeToApp: parsedNode.attributeToApp,
                attributeToUser: parsedNode.attributeToUser,
                createdAt: parsedNode.createdAt,
                criticalAlert: parsedNode.criticalAlert,
                message: parsedNode.message,
                ...(parsedNode.arguments !== undefined && { arguments: parsedNode.arguments }),
                ...(parsedNode.subjectId !== undefined && { subjectId: parsedNode.subjectId }),
                ...(parsedNode.subjectType !== undefined && { subjectType: parsedNode.subjectType }),
                ...(parsedNode.additionalContent != null && { additionalContent: parsedNode.additionalContent })
            };
        });

        return {
            events,
            ...(eventsConnection.pageInfo.hasNextPage && eventsConnection.pageInfo.endCursor != null
                ? { next_cursor: eventsConnection.pageInfo.endCursor }
                : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
