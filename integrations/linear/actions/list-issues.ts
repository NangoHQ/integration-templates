import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(100).optional().describe('Number of issues to return per page. Example: 50'),
    after: z.string().optional().describe('Pagination cursor for forward pagination. Example: "eyJvcmRlciI6..."'),
    orderBy: z.string().optional().describe('Field to order by. Example: "updatedAt" or "createdAt"'),
    filter: z.record(z.string(), z.unknown()).optional().describe('Issue filter object. Example: { state: { type: { eq: "started" } } }')
});

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.string().nullish(),
    priority: z.number().nullish(),
    state: z
        .object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            color: z.string().nullish()
        })
        .nullish(),
    team: z
        .object({
            id: z.string(),
            key: z.string(),
            name: z.string()
        })
        .nullish(),
    assignee: z
        .object({
            id: z.string(),
            name: z.string(),
            email: z.string().nullish()
        })
        .nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    url: z.string().nullish()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: z.string().optional(),
    endCursor: z.string().optional()
});

const OutputSchema = z.object({
    issues: z.array(IssueSchema),
    pageInfo: PageInfoSchema,
    nextCursor: z.string().optional().describe('Convenience field matching pageInfo.endCursor when hasNextPage is true')
});

const GraphQLErrorSchema = z.object({
    message: z.string()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            issues: z.object({
                nodes: z.array(z.unknown()),
                pageInfo: PageInfoSchema
            })
        })
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'List Linear issues with filtering and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-issues',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query Issues($first: Int, $after: String, $orderBy: PaginationOrderBy, $filter: IssueFilter) {
                issues(first: $first, after: $after, orderBy: $orderBy, filter: $filter) {
                    nodes {
                        id
                        identifier
                        title
                        description
                        priority
                        state {
                            id
                            name
                            type
                            color
                        }
                        team {
                            id
                            key
                            name
                        }
                        assignee {
                            id
                            name
                            email
                        }
                        createdAt
                        updatedAt
                        url
                    }
                    pageInfo {
                        hasNextPage
                        hasPreviousPage
                        startCursor
                        endCursor
                    }
                }
            }
        `;

        const variables: Record<string, unknown> = {};
        if (input.first !== undefined) {
            variables['first'] = input.first;
        }
        if (input.after !== undefined && input.after !== '') {
            variables['after'] = input.after;
        }
        if (input.orderBy !== undefined && input.orderBy !== '') {
            variables['orderBy'] = input.orderBy;
        }
        if (input.filter !== undefined && Object.keys(input.filter).length > 0) {
            variables['filter'] = input.filter;
        }

        // https://linear.app/developers/api-graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables
            },
            retries: 3
        });

        if (response.data === undefined || response.data === null || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Received invalid or empty response from Linear GraphQL API'
            });
        }

        const parsedResponse = GraphQLResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse GraphQL response structure',
                details: parsedResponse.error.issues
            });
        }

        const responseErrors = parsedResponse.data.errors;
        if (responseErrors && responseErrors.length > 0) {
            const firstError = responseErrors.at(0);
            if (firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: firstError.message,
                    errors: responseErrors
                });
            }
        }

        if (!parsedResponse.data.data || !parsedResponse.data.data.issues) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing issues data in GraphQL response'
            });
        }

        const connection = parsedResponse.data.data.issues;

        const parsedNodes = z.array(IssueSchema).safeParse(connection.nodes);
        if (!parsedNodes.success) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Failed to validate issue nodes from provider response',
                details: parsedNodes.error.issues
            });
        }

        return {
            issues: parsedNodes.data,
            pageInfo: connection.pageInfo,
            ...(connection.pageInfo.hasNextPage && connection.pageInfo.endCursor !== undefined && { nextCursor: connection.pageInfo.endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
