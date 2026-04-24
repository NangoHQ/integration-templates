import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    avatarUrl: z.string().optional(),
    active: z.boolean().optional(),
    displayName: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const UserNodeSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    active: z.boolean().nullable().optional(),
    displayName: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            users: z.object({
                nodes: z.array(z.unknown()),
                pageInfo: PageInfoSchema
            })
        })
        .optional()
});

const sync = createSync({
    description: 'Sync Linear users with profile and active state fields.',
    version: '3.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/users' }],
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let checkpoint: { updated_after: string } | undefined;
        if (rawCheckpoint) {
            const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpointResult.success) {
                throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
            }
            checkpoint = checkpointResult.data;
        }

        let after: string | undefined;
        let highWaterMark: string | undefined;
        let continuePagination = true;

        const filter = checkpoint?.updated_after ? { updatedAt: { gte: checkpoint.updated_after } } : undefined;

        while (continuePagination) {
            // https://linear.app/developers/api-reference/graphql#query-users
            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: `
                        query Users($after: String, $first: Int, $orderBy: PaginationOrderBy, $filter: UserFilter) {
                            users(after: $after, first: $first, orderBy: $orderBy, filter: $filter) {
                                nodes {
                                    id
                                    name
                                    email
                                    avatarUrl
                                    active
                                    displayName
                                    createdAt
                                    updatedAt
                                }
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                            }
                        }
                    `,
                    variables: {
                        after,
                        first: 100,
                        orderBy: 'updatedAt',
                        ...(filter && { filter })
                    }
                },
                retries: 3
            });

            const body = response.data;
            if (typeof body !== 'object' || body === null) {
                throw new Error('Invalid GraphQL response body');
            }

            const parsedBody = GraphQLResponseSchema.safeParse(body);
            if (!parsedBody.success) {
                throw new Error(`GraphQL response validation failed: ${parsedBody.error.message}`);
            }

            const usersData = parsedBody.data.data?.users;
            if (!usersData) {
                throw new Error('Missing users data in GraphQL response');
            }

            const nodes = usersData.nodes;
            if (!Array.isArray(nodes)) {
                throw new Error('Invalid nodes in users response');
            }

            if (nodes.length === 0) {
                break;
            }

            const users = nodes.map((node) => {
                const parsedNode = UserNodeSchema.safeParse(node);
                if (!parsedNode.success) {
                    throw new Error(`Invalid user node: ${parsedNode.error.message}`);
                }

                const user = parsedNode.data;
                return {
                    id: user.id,
                    ...(user.name != null && { name: user.name }),
                    ...(user.email != null && { email: user.email }),
                    ...(user.avatarUrl != null && { avatarUrl: user.avatarUrl }),
                    ...(user.active != null && { active: user.active }),
                    ...(user.displayName != null && { displayName: user.displayName }),
                    ...(user.createdAt != null && { createdAt: user.createdAt }),
                    ...(user.updatedAt != null && { updatedAt: user.updatedAt })
                };
            });

            await nango.batchSave(users, 'User');

            const firstUpdatedAt = users[0]?.updatedAt;
            if (!highWaterMark && firstUpdatedAt) {
                highWaterMark = firstUpdatedAt;
            }

            const pageInfo = usersData.pageInfo;
            if (!pageInfo.hasNextPage || !pageInfo.endCursor) {
                continuePagination = false;
            } else {
                after = pageInfo.endCursor;
            }
        }

        if (highWaterMark) {
            await nango.saveCheckpoint({ updated_after: highWaterMark });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
