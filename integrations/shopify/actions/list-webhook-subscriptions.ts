import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('The number of webhook subscriptions to return (1-250). Default: 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    topics: z.array(z.string()).optional().describe('List of webhook subscription topics to filter by.'),
    callbackUrl: z.string().optional().describe('Callback URL to filter by.')
});

const WebhookSubscriptionNodeSchema = z.object({
    id: z.string(),
    topic: z.string(),
    uri: z.string(),
    format: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    legacyResourceId: z.string()
});

const WebhookSubscriptionEdgeSchema = z.object({
    node: WebhookSubscriptionNodeSchema,
    cursor: z.string()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const WebhookSubscriptionConnectionSchema = z.object({
    edges: z.array(WebhookSubscriptionEdgeSchema),
    pageInfo: PageInfoSchema
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            webhookSubscriptions: WebhookSubscriptionConnectionSchema
        })
        .optional(),
    errors: z.array(z.object({ message: z.string().optional() })).optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            topic: z.string(),
            uri: z.string(),
            format: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
            legacyResourceId: z.string()
        })
    ),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List webhook subscriptions registered for the Shopify app.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_webhooks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const first = input.first ?? 50;

        const query = `
            query WebhookSubscriptions($first: Int!, $after: String, $topics: [WebhookSubscriptionTopic!], $callbackUrl: URL) {
                webhookSubscriptions(first: $first, after: $after, topics: $topics, callbackUrl: $callbackUrl) {
                    edges {
                        node {
                            id
                            topic
                            uri
                            format
                            createdAt
                            updatedAt
                            legacyResourceId
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

        const variables: Record<string, unknown> = {
            first
        };

        if (input.after !== undefined) {
            variables['after'] = input.after;
        }

        if (input.topics !== undefined && input.topics.length > 0) {
            variables['topics'] = input.topics;
        }

        if (input.callbackUrl !== undefined) {
            variables['callbackUrl'] = input.callbackUrl;
        }

        // https://shopify.dev/docs/api/admin-graphql/2026-01/queries/webhookSubscriptions
        const response = await nango.post({
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        });

        const responseData = GraphQLResponseSchema.parse(response.data);

        const errors = responseData.errors;
        if (errors !== undefined && errors.length > 0) {
            const firstError = errors[0];
            if (firstError !== undefined) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: firstError.message || 'GraphQL error',
                    errors
                });
            }
        }

        const connection = responseData.data?.webhookSubscriptions;
        if (!connection) {
            throw new nango.ActionError({
                type: 'missing_data',
                message: 'No webhookSubscriptions data in response'
            });
        }

        return {
            items: connection.edges.map((edge) => ({
                id: edge.node.id,
                topic: edge.node.topic,
                uri: edge.node.uri,
                format: edge.node.format,
                createdAt: edge.node.createdAt,
                updatedAt: edge.node.updatedAt,
                legacyResourceId: edge.node.legacyResourceId
            })),
            ...(connection.pageInfo.hasNextPage && connection.pageInfo.endCursor != null ? { nextCursor: connection.pageInfo.endCursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
