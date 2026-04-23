import { createSync } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatarUrl: z.union([z.string(), z.null()]),
    active: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
});

const CheckpointSchema = z.object({
    after: z.string()
});

type UserModel = typeof UserSchema;
type CheckpointType = typeof CheckpointSchema;

interface UsersResponse {
    data?: {
        users?: {
            nodes: Array<{
                id: string;
                name: string;
                email: string;
                avatarUrl: string | null;
                active: boolean;
                createdAt: string;
                updatedAt: string;
            }>;
            pageInfo: {
                hasNextPage: boolean;
                endCursor?: string | null;
            };
        };
    };
}

const sync = createSync<{ User: UserModel }, undefined, CheckpointType>({
    description: 'Sync Linear users with profile and active state fields',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/users'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // Do not resume from a mid-pagination cursor: trackDeletesEnd requires a
        // complete scan, so every run must start from page 1.
        void checkpoint;
        let after: string | undefined = undefined;

        await nango.trackDeletesStart('User');

        // GraphQL pagination requires manual cursor extraction from nested pageInfo
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            // https://linear.app/developers/graphql
            // https://linear.app/developers/pagination
            const response: { data: UsersResponse } = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: `
                        query Users($first: Int, $after: String) {
                            users(first: $first, after: $after, orderBy: updatedAt) {
                                nodes {
                                    id
                                    name
                                    email
                                    avatarUrl
                                    active
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
                        first: 100,
                        after: after ?? null
                    }
                },
                retries: 3
            });

            const usersData = response.data.data?.users;
            if (!usersData) {
                throw new Error('Linear users response did not include a users connection');
            }

            const nodes = usersData.nodes;
            const pageInfo = usersData.pageInfo;
            if (!pageInfo) {
                throw new Error('Linear users response did not include pagination info');
            }

            if (!Array.isArray(nodes) || nodes.length === 0) {
                await nango.saveCheckpoint({ after: '' });
                break;
            }

            const users = nodes.map(
                (user: { id: string; name: string; email: string; avatarUrl: string | null; active: boolean; createdAt: string; updatedAt: string }) => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    avatarUrl: user.avatarUrl ?? null,
                    active: user.active,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                })
            );

            await nango.batchSave(users, 'User');

            if (!pageInfo.hasNextPage) {
                await nango.saveCheckpoint({ after: '' });
                break;
            }

            if (!pageInfo.endCursor) {
                throw new Error('Linear users pagination indicated more pages without an end cursor');
            }

            const nextCursor = pageInfo.endCursor;
            after = nextCursor;
            await nango.saveCheckpoint({ after: nextCursor });
        }

        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
