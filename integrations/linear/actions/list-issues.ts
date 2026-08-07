import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    first: z.number().int().min(1).max(100).optional().describe('Number of issues to return per page. Example: 50'),
    orderBy: z.string().optional().describe('Field to order by. Example: "updatedAt" or "createdAt"'),
    filter: z.record(z.string(), z.unknown()).optional().describe('Issue filter object. Example: { team: { id: { eq: "team-id" } } }')
});

const IssueNodeSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.string().optional().nullable(),
    priority: z.number().optional().nullable(),
    state: z
        .object({
            id: z.string(),
            name: z.string(),
            type: z.string().optional(),
            color: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    assignee: z
        .object({
            id: z.string(),
            name: z.string(),
            email: z.string().optional().nullable()
        })
        .optional()
        .nullable(),
    team: z
        .object({
            id: z.string(),
            name: z.string(),
            key: z.string().optional()
        })
        .optional()
        .nullable(),
    project: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
        .nullable(),
    cycle: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional()
        .nullable(),
    labels: z
        .object({
            nodes: z
                .array(
                    z.object({
                        id: z.string(),
                        name: z.string()
                    })
                )
                .optional()
                .nullable()
        })
        .optional()
        .nullable(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    archivedAt: z.string().optional().nullable(),
    url: z.string().optional().nullable()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: z.string().optional().nullable(),
    endCursor: z.string().optional().nullable()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            issues: z
                .object({
                    nodes: z.array(z.unknown()),
                    pageInfo: PageInfoSchema
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    items: z.array(IssueNodeSchema),
    pageInfo: PageInfoSchema,
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Linear issues with filtering and pagination.',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

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
                        assignee {
                            id
                            name
                            email
                        }
                        team {
                            id
                            name
                            key
                        }
                        project {
                            id
                            name
                        }
                        cycle {
                            id
                            name
                        }
                        labels {
                            nodes {
                                id
                                name
                            }
                        }
                        createdAt
                        updatedAt
                        archivedAt
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
        if (input.cursor !== undefined && input.cursor !== '') {
            variables['after'] = input.cursor;
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
            const firstError = responseErrors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: firstError.message,
                    errors: responseErrors
                });
            }
        }

        const issuesData = parsedResponse.data.data?.issues;
        if (!issuesData) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing issues data in GraphQL response'
            });
        }

        const parsedNodes = z.array(IssueNodeSchema).safeParse(issuesData.nodes);
        if (!parsedNodes.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to validate issue nodes from provider response',
                details: parsedNodes.error.issues
            });
        }

        return {
            items: parsedNodes.data,
            pageInfo: issuesData.pageInfo,
            ...(issuesData.pageInfo.hasNextPage && issuesData.pageInfo.endCursor != null && { nextCursor: issuesData.pageInfo.endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
