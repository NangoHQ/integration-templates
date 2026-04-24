import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().optional().describe('The number of items to forward paginate. Defaults to 50.'),
    after: z.string().optional().describe('A cursor to be used with first for forward pagination.'),
    filter: z.record(z.string(), z.unknown()).optional().describe('[Alpha] Filter returned issue labels.'),
    orderBy: z.string().optional().describe('Ordering of returned results. Example: "updatedAt", "createdAt".')
});

const IssueLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable().optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    archivedAt: z.string().datetime().nullable().optional(),
    isGroup: z.boolean().optional(),
    parent: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional(),
    creator: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional(),
    team: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .nullable()
        .optional()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    nodes: z.array(IssueLabelSchema),
    pageInfo: PageInfoSchema
});

const GraphQLIssueLabelsResponseSchema = z.object({
    data: z.object({
        issueLabels: z.object({
            nodes: z.array(z.unknown()),
            pageInfo: PageInfoSchema
        })
    })
});

const action = createAction({
    description: 'List Linear issue labels with filtering and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-issue-labels',
        group: 'Issue Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: Record<string, unknown> = {};

        if (input.first !== undefined) {
            variables['first'] = input.first;
        }
        if (input.after !== undefined) {
            variables['after'] = input.after;
        }
        if (input.filter !== undefined) {
            variables['filter'] = input.filter;
        }
        if (input.orderBy !== undefined) {
            variables['orderBy'] = input.orderBy;
        }

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api/pagination
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `query IssueLabels($first: Int, $after: String, $filter: IssueLabelFilter, $orderBy: PaginationOrderBy) {
                    issueLabels(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                        nodes {
                            id
                            name
                            color
                            description
                            createdAt
                            updatedAt
                            archivedAt
                            isGroup
                            parent {
                                id
                            }
                            creator {
                                id
                            }
                            team {
                                id
                                name
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }`,
                variables: variables
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or missing response data from Linear GraphQL API.'
            });
        }

        const parsedResponse = GraphQLIssueLabelsResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse GraphQL response.',
                details: parsedResponse.error.message
            });
        }

        const nodes = parsedResponse.data.data.issueLabels.nodes;
        const pageInfo = parsedResponse.data.data.issueLabels.pageInfo;

        return {
            nodes: nodes.map((node) => IssueLabelSchema.parse(node)),
            pageInfo: pageInfo
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
