import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().optional().describe('Number of users to return (max 250). Default: 50'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filter: z
        .object({
            active: z
                .object({
                    eq: z.boolean().optional().describe('Filter by active status (true for active, false for inactive)')
                })
                .optional(),
            email: z
                .object({
                    eq: z.string().optional().describe('Filter by exact email match'),
                    contains: z.string().optional().describe('Filter by email containing substring')
                })
                .optional(),
            name: z
                .object({
                    eq: z.string().optional().describe('Filter by exact name match'),
                    contains: z.string().optional().describe('Filter by name containing substring'),
                    startsWith: z.string().optional().describe('Filter by name starting with substring')
                })
                .optional(),
            displayName: z
                .object({
                    eq: z.string().optional().describe('Filter by exact display name match'),
                    contains: z.string().optional().describe('Filter by display name containing substring')
                })
                .optional(),
            admin: z
                .object({
                    eq: z.boolean().optional().describe('Filter by admin status')
                })
                .optional()
        })
        .optional()
        .describe('Filter conditions for users'),
    orderBy: z.enum(['createdAt', 'updatedAt']).optional().describe('Sort order for results. Default: createdAt')
});

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    displayName: z.union([z.string(), z.null()]),
    avatarUrl: z.union([z.string(), z.null()]),
    active: z.boolean(),
    admin: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    users: z.array(UserSchema),
    nextCursor: z.union([z.string(), z.null()]).describe('Cursor for the next page of results. Null if no more pages.'),
    hasMore: z.boolean().describe('Whether there are more pages of results.')
});

// Zod schema for parsing the GraphQL response
const LinearUserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    displayName: z.union([z.string(), z.null()]),
    avatarUrl: z.union([z.string(), z.null()]),
    active: z.boolean(),
    admin: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.union([z.string(), z.null()])
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            users: z.object({
                nodes: z.array(LinearUserSchema).default([]),
                pageInfo: z
                    .object({
                        hasNextPage: z.boolean().default(false),
                        endCursor: z.union([z.string(), z.null()]).default(null)
                    })
                    .default({ hasNextPage: false, endCursor: null })
            })
        })
        .optional(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const action = createAction({
    description: 'List Linear users with filtering and pagination',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-users',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query Users($first: Int, $after: String, $filter: UserFilter, $orderBy: PaginationOrderBy) {
                users(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                    nodes {
                        id
                        name
                        email
                        displayName
                        avatarUrl
                        active
                        admin
                        createdAt
                        updatedAt
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables: {
            first?: number;
            after?: string;
            filter?: Record<string, unknown>;
            orderBy?: string;
        } = {};

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

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables
            },
            retries: 3
        });

        // Parse response with Zod schema
        const parseResult = GraphQLResponseSchema.safeParse(response.data);

        if (!parseResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response structure from Linear API',
                details: parseResult.error.message
            });
        }

        const responseData = parseResult.data;

        if (responseData.errors && responseData.errors.length > 0) {
            const errorMessage = responseData.errors.map((e) => e.message).join(', ');
            throw new nango.ActionError({
                type: 'graphql_error',
                message: `Linear GraphQL API error: ${errorMessage}`
            });
        }

        if (!responseData.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing data in Linear API response'
            });
        }

        const usersData = responseData.data.users;

        return {
            users: usersData.nodes.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                active: user.active,
                admin: user.admin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            })),
            nextCursor: usersData.pageInfo.endCursor,
            hasMore: usersData.pageInfo.hasNextPage
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
