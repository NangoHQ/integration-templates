import { createSync } from 'nango';
import { z } from 'zod';

const CycleSchema = z.object({
    id: z.string(),
    name: z.string(),
    number: z.number(),
    starts_at: z.string(),
    ends_at: z.string(),
    completed_at: z.union([z.string(), z.null()]),
    updated_at: z.string(),
    team_id: z.union([z.string(), z.null()]),
    team_name: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Linear cycles for planning and iteration tracking.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/sync-cycles' }],
    checkpoint: CheckpointSchema,
    models: {
        Cycle: CycleSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint?.cursor;

        // https://linear.app/developers/graphql
        // https://linear.app/developers/pagination
        // Keep a checkpointed full refresh so Nango can still detect deleted cycles.
        await nango.trackDeletesStart('Cycle');

        while (true) {
            const response = await nango.post({
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

            const edges = cyclesData.edges || [];
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
                    starts_at: edge.node.startsAt,
                    ends_at: edge.node.endsAt,
                    completed_at: edge.node.completedAt ?? null,
                    updated_at: edge.node.updatedAt,
                    team_id: edge.node.team?.id ?? null,
                    team_name: edge.node.team?.name ?? null
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
