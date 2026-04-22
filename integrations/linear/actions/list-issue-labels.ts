import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().optional().describe('Number of items to return per page. Example: 50'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Example: "cursor123"'),
    filter: z
        .object({
            name: z
                .object({
                    eq: z.string().optional().describe('Exact name match'),
                    contains: z.string().optional().describe('Partial name match'),
                    in: z.array(z.string()).optional().describe('Match any in array')
                })
                .optional()
                .describe('Name filter options'),
            team: z
                .object({
                    id: z
                        .object({
                            eq: z.string().optional().describe('Exact team ID match'),
                            in: z.array(z.string()).optional().describe('Match any team ID in array')
                        })
                        .optional()
                })
                .optional()
                .describe('Team filter options'),
            createdAt: z
                .object({
                    gt: z.string().optional().describe('Created after this ISO timestamp'),
                    lt: z.string().optional().describe('Created before this ISO timestamp')
                })
                .optional()
                .describe('Created at filter options'),
            updatedAt: z
                .object({
                    gt: z.string().optional().describe('Updated after this ISO timestamp'),
                    lt: z.string().optional().describe('Updated before this ISO timestamp')
                })
                .optional()
                .describe('Updated at filter options')
        })
        .optional()
        .describe('Filter options for issue labels'),
    orderBy: z
        .object({
            createdAt: z.enum(['Ascending', 'Descending']).optional(),
            updatedAt: z.enum(['Ascending', 'Descending']).optional(),
            name: z.enum(['Ascending', 'Descending']).optional()
        })
        .optional()
        .describe('Ordering options for results')
});

const LabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    description: z.union([z.string(), z.null()]),
    createdAt: z.string(),
    updatedAt: z.string(),
    team: z.union([
        z.object({
            id: z.string(),
            name: z.string()
        }),
        z.null()
    ]),
    creator: z.union([
        z.object({
            id: z.string(),
            name: z.string(),
            email: z.string()
        }),
        z.null()
    ]),
    isGroup: z.boolean()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: z.union([z.string(), z.null()]),
    endCursor: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    labels: z.array(LabelSchema),
    pageInfo: PageInfoSchema
});

const action = createAction({
    description: 'List Linear issue labels with filtering and pagination',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-issue-labels',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query IssueLabels($first: Int, $after: String, $filter: IssueLabelFilter, $orderBy: PaginationOrderBy) {
                issueLabels(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                    nodes {
                        id
                        name
                        color
                        description
                        createdAt
                        updatedAt
                        team {
                            id
                            name
                        }
                        creator {
                            id
                            name
                            email
                        }
                        isGroup
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

        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables: {
                    first: input.first,
                    after: input.after,
                    filter: input.filter,
                    orderBy: input.orderBy
                }
            },
            retries: 3
        });

        if (!response.data || !response.data.data || !response.data.data.issueLabels) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid response from Linear API'
            });
        }

        const issueLabels = response.data.data.issueLabels;

        return {
            labels: issueLabels.nodes.map(
                (node: {
                    id: string;
                    name: string;
                    color: string;
                    description: string | null;
                    createdAt: string;
                    updatedAt: string;
                    team: { id: string; name: string } | null;
                    creator: { id: string; name: string; email: string } | null;
                    isGroup: boolean;
                }) => ({
                    id: node.id,
                    name: node.name,
                    color: node.color,
                    description: node.description,
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                    team: node.team,
                    creator: node.creator,
                    isGroup: node.isGroup
                })
            ),
            pageInfo: {
                hasNextPage: issueLabels.pageInfo.hasNextPage,
                hasPreviousPage: issueLabels.pageInfo.hasPreviousPage,
                startCursor: issueLabels.pageInfo.startCursor,
                endCursor: issueLabels.pageInfo.endCursor
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
