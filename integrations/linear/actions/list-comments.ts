import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().optional().describe('Number of items to return. Defaults to 50.'),
    after: z.string().optional().describe('Cursor for forward pagination.'),
    filter: z.record(z.string(), z.unknown()).optional().describe('Comment filter object.'),
    orderBy: z.string().optional().describe('Order by field, e.g. "createdAt" or "updatedAt".')
});

const UserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional()
});

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string().optional(),
    title: z.string().optional()
});

const ParentSchema = z.object({
    id: z.string()
});

const CommentSchema = z.object({
    id: z.string(),
    body: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    url: z.string(),
    user: UserSchema.nullable().optional(),
    issue: IssueSchema.nullable().optional(),
    parent: ParentSchema.nullable().optional(),
    editedAt: z.string().nullable().optional()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional(),
    hasPreviousPage: z.boolean(),
    startCursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(CommentSchema),
    nextCursor: z.string().optional(),
    pageInfo: PageInfoSchema
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        comments: z.object({
            nodes: z.array(CommentSchema),
            pageInfo: PageInfoSchema
        })
    })
});

const action = createAction({
    description: 'List Linear comments with filtering and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-comments',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input) => {
        const query = `
            query Comments($first: Int, $after: String, $filter: CommentFilter, $orderBy: PaginationOrderBy) {
                comments(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                    nodes {
                        id
                        body
                        createdAt
                        updatedAt
                        url
                        user {
                            id
                            name
                            email
                        }
                        issue {
                            id
                            identifier
                            title
                        }
                        parent {
                            id
                        }
                        editedAt
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                        hasPreviousPage
                        startCursor
                    }
                }
            }
        `;

        const variables: { first?: number; after?: string; filter?: Record<string, unknown>; orderBy?: string } = {};
        if (input.first !== undefined) {
            variables.first = input.first;
        }
        if (input.after !== undefined) {
            variables.after = input.after;
        }
        if (input.filter !== undefined) {
            variables.filter = input.filter;
        }
        if (input.orderBy !== undefined) {
            variables.orderBy = input.orderBy;
        }

        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query,
                variables
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Linear GraphQL response',
                details: parsed.error.message
            });
        }

        const comments = parsed.data.data.comments;

        return {
            items: comments.nodes,
            nextCursor: comments.pageInfo.endCursor ?? undefined,
            pageInfo: comments.pageInfo
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
