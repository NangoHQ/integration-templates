import { createSync } from 'nango';
import { z } from 'zod';

const TeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    key: z.string(),
    description: z.union([z.string(), z.null()]),
    color: z.union([z.string(), z.null()]),
    icon: z.union([z.string(), z.null()]),
    createdAt: z.string(),
    updatedAt: z.string()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync<{ Team: typeof TeamSchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync Linear teams visible to the authenticated user',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/sync-teams' }],
    checkpoint: CheckpointSchema,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // Do not resume from a mid-pagination cursor: trackDeletesEnd requires a
        // complete scan, so every run must start from page 1.
        void checkpoint;
        let cursor = '';
        let hasMore = true;

        await nango.trackDeletesStart('Team');

        while (hasMore) {
            // https://linear.app/developers/pagination
            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: `
                        query Teams($first: Int, $after: String) {
                            teams(first: $first, after: $after) {
                                nodes {
                                    id
                                    name
                                    key
                                    description
                                    color
                                    icon
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
                        after: cursor || null
                    }
                },
                retries: 3
            });

            const teamsData = response.data.data?.teams;
            if (!teamsData) {
                throw new Error('Linear teams response did not include a teams connection');
            }

            const nodes = teamsData.nodes;
            const pageInfo = teamsData.pageInfo;
            if (!pageInfo) {
                throw new Error('Linear teams response did not include pagination info');
            }

            if (nodes && nodes.length > 0) {
                const teams = nodes.map(
                    (team: {
                        id: string;
                        name: string;
                        key: string;
                        description?: string | null;
                        color?: string | null;
                        icon?: string | null;
                        createdAt: string;
                        updatedAt: string;
                    }) => ({
                        id: team.id,
                        name: team.name,
                        key: team.key,
                        description: team.description ?? null,
                        color: team.color ?? null,
                        icon: team.icon ?? null,
                        createdAt: team.createdAt,
                        updatedAt: team.updatedAt
                    })
                );

                await nango.batchSave(teams, 'Team');
            }

            hasMore = pageInfo.hasNextPage;
            cursor = pageInfo.endCursor || '';

            if (hasMore) {
                if (!cursor) {
                    throw new Error('Linear teams pagination indicated more pages without an end cursor');
                }

                await nango.saveCheckpoint({ cursor });
            } else {
                await nango.saveCheckpoint({ cursor: '' });
            }
        }

        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
