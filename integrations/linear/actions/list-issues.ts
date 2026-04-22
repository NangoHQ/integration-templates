import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(100).optional().describe('Number of issues to fetch (max 100). Default: 50'),
    after: z.string().optional().describe('Pagination cursor for fetching the next page'),
    orderBy: z
        .union([z.literal('createdAt'), z.literal('updatedAt')])
        .optional()
        .describe('Order results by createdAt or updatedAt. Default: createdAt'),
    filter: z.optional(z.record(z.string(), z.unknown()))
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: z.union([z.string(), z.null()]),
    endCursor: z.union([z.string(), z.null()])
});

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.union([z.string(), z.null()]),
    state: z.object({
        id: z.string(),
        name: z.string(),
        type: z.string()
    }),
    assignee: z.union([
        z.object({
            id: z.string(),
            name: z.string(),
            email: z.string()
        }),
        z.null()
    ]),
    team: z.object({
        id: z.string(),
        name: z.string(),
        key: z.string()
    }),
    priority: z.union([z.number(), z.null()]),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    issues: z.array(IssueSchema),
    pageInfo: PageInfoSchema
});

interface LinearIssueNode {
    id: string;
    identifier: string;
    title: string;
    description?: string | null;
    state: {
        id: string;
        name: string;
        type: string;
    };
    assignee?: {
        id: string;
        name: string;
        email: string;
    } | null;
    team: {
        id: string;
        name: string;
        key: string;
    };
    priority?: number | null;
    createdAt: string;
    updatedAt: string;
    archivedAt?: string | null;
}

interface LinearIssuesResponse {
    data?: {
        issues?: {
            nodes?: LinearIssueNode[];
            pageInfo?: {
                hasNextPage?: boolean;
                hasPreviousPage?: boolean;
                startCursor?: string | null;
                endCursor?: string | null;
            };
        };
    };
    errors?: Array<{ message: string }>;
}

const action = createAction({
    description: 'List Linear issues with filtering and pagination',
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
        const first = input.first ?? 50;
        const orderBy = input.orderBy ?? 'createdAt';

        const variables: Record<string, unknown> = {
            first,
            orderBy
        };

        if (input.after) {
            variables['after'] = input.after;
        }

        if (input.filter) {
            variables['filter'] = input.filter;
        }

        const query = `
            query Issues($first: Int!, $after: String, $orderBy: PaginationOrderBy, $filter: IssueFilter) {
                issues(first: $first, after: $after, orderBy: $orderBy, filter: $filter) {
                    nodes {
                        id
                        identifier
                        title
                        description
                        state {
                            id
                            name
                            type
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
                        priority
                        createdAt
                        updatedAt
                        archivedAt
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

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post<LinearIssuesResponse>({
            endpoint: '/graphql',
            data: {
                query,
                variables
            },
            retries: 3
        });

        if (response.data?.errors && response.data.errors.length > 0) {
            const errorMessage = response.data.errors.map((e) => e.message).join(', ');
            throw new nango.ActionError({
                type: 'graphql_error',
                message: `Linear GraphQL error: ${errorMessage}`
            });
        }

        const issuesData = response.data?.data?.issues;
        if (!issuesData) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API: missing issues data'
            });
        }

        const nodes = issuesData.nodes ?? [];
        const pageInfo = issuesData.pageInfo ?? {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null
        };

        const issues = nodes.map((node: LinearIssueNode) => ({
            id: node.id,
            identifier: node.identifier,
            title: node.title,
            description: node.description ?? null,
            state: {
                id: node.state.id,
                name: node.state.name,
                type: node.state.type
            },
            assignee: node.assignee ?? null,
            team: {
                id: node.team.id,
                name: node.team.name,
                key: node.team.key
            },
            priority: node.priority ?? null,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            archivedAt: node.archivedAt ?? null
        }));

        return {
            issues,
            pageInfo: {
                hasNextPage: pageInfo.hasNextPage ?? false,
                hasPreviousPage: pageInfo.hasPreviousPage ?? false,
                startCursor: pageInfo.startCursor ?? null,
                endCursor: pageInfo.endCursor ?? null
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
