import { createSync } from 'nango';
import { z } from 'zod';

const CycleSchema = z.object({
    id: z.string(),
    name: z.string(),
    number: z.number(),
    startsAt: z.string(),
    endsAt: z.string(),
    completedAt: z.union([z.string(), z.null()]),
    updatedAt: z.string(),
    teamId: z.union([z.string(), z.null()]),
    teamName: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

interface CyclesResponse {
    data?: {
        cycles?: {
            edges: Array<{
                node: {
                    id: string;
                    name: string;
                    number: number;
                    startsAt: string;
                    endsAt: string;
                    completedAt: string | null;
                    updatedAt: string;
                    team: { id: string; name: string } | null;
                };
                cursor: string;
            }>;
            pageInfo: {
                hasNextPage: boolean;
                endCursor?: string | null;
            };
        };
    };
}

const sync = createSync({
    description: 'Sync Linear cycles for planning and iteration tracking.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/cycles' }],
    checkpoint: CheckpointSchema,
    models: {
        Cycle: CycleSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // Do not resume from a mid-pagination cursor: trackDeletesEnd requires a
        // complete scan, so every run must start from page 1.
        void checkpoint;
        let cursor: string | undefined = undefined;

        await nango.trackDeletesStart('Cycle');

        while (true) {
            const response: { data: CyclesResponse } = await nango.post({
                // https://linear.app/developers/graphql
                endpoint: '/graphql',
                data: {
                    query: `
                        query Cycles($after: String) {
                            cycles(first: 100, after: $after) {
                                edges {
                                    node {
                                        id
                                        name
                                        number
                                        startsAt
                                        endsAt
                                        completedAt
                                        updatedAt
                                        team {
                                            id
                                            name
                                        }
                                    }
                                    cursor
                                }
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                            }
                        }
                    `,
                    variables: {
                        ...(cursor && { after: cursor })
                    }
                },
                retries: 3
            });

            const cyclesData = response.data.data?.cycles;
            if (!cyclesData) {
                throw new Error('Linear cycles response did not include a cycles connection');
            }

            if (!cyclesData.edges) {
                throw new Error('Linear cycles response did not include edges; aborting to prevent incorrect delete reconciliation');
            }
            const edges = cyclesData.edges;
            const cycles = edges.map(
                (edge: {
                    node: {
                        id: string;
                        name: string;
                        number: number;
                        startsAt: string;
                        endsAt: string;
                        completedAt: string | null;
                        updatedAt: string;
                        team: { id: string; name: string } | null;
                    };
                }) => ({
                    id: edge.node.id,
                    name: edge.node.name,
                    number: edge.node.number,
                    startsAt: edge.node.startsAt,
                    endsAt: edge.node.endsAt,
                    completedAt: edge.node.completedAt ?? null,
                    updatedAt: edge.node.updatedAt,
                    teamId: edge.node.team?.id ?? null,
                    teamName: edge.node.team?.name ?? null
                })
            );

            if (cycles.length > 0) {
                await nango.batchSave(cycles, 'Cycle');
            }

            const pageInfo = cyclesData.pageInfo;
            if (!pageInfo) {
                throw new Error('Linear cycles response did not include pagination info');
            }

            if (!pageInfo.hasNextPage) {
                await nango.saveCheckpoint({ cursor: '' });
                break;
            }

            if (!pageInfo.endCursor) {
                throw new Error('Linear cycles pagination indicated more pages without an end cursor');
            }

            const nextCursor = pageInfo.endCursor;
            cursor = nextCursor;
            await nango.saveCheckpoint({ cursor: nextCursor });
        }

        await nango.trackDeletesEnd('Cycle');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
