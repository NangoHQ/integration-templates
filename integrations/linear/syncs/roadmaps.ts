import { createSync } from 'nango';
import { z } from 'zod';

// https://developers.linear.app/docs/graphql/working-with-the-graphql-api/pagination
const RoadmapSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    ownerId: z.union([z.string(), z.null()]),
    ownerName: z.union([z.string(), z.null()]),
    projectIds: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.union([z.string(), z.null()]),
    sortOrder: z.union([z.number(), z.null()])
});

// Checkpoint: cursor for pagination + updated_after for incremental syncs
// Note: CheckpointSchema values must be ZodString | ZodNumber | ZodBoolean only
const CheckpointSchema = z.object({
    cursor: z.string(),
    updatedAfter: z.string()
});

const sync = createSync({
    description: 'Sync Linear roadmaps and their project relationships',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Roadmap: RoadmapSchema
    },
    endpoints: [
        {
            path: '/syncs/roadmaps',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Do not resume from a mid-pagination cursor: trackDeletesEnd requires a
        // complete scan, so every run must start from page 1.
        await nango.trackDeletesStart('Roadmap');

        let cursor: string | undefined = undefined;
        let updatedAfter: string | undefined = checkpoint?.['updatedAfter'] || undefined;

        while (true) {
            // https://developers.linear.app/docs/graphql/working-with-the-graphql-api/pagination
            // Note: The roadmaps query does not support filter argument like issues do
            const query = `
                query Roadmaps($first: Int!, $after: String, $orderBy: PaginationOrderBy) {
                    roadmaps(
                        first: $first,
                        after: $after,
                        orderBy: $orderBy
                    ) {
                        nodes {
                            id
                            name
                            description
                            owner {
                                id
                                name
                            }
                            projects {
                                nodes {
                                    id
                                }
                            }
                            createdAt
                            updatedAt
                            archivedAt
                            sortOrder
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            `;

            // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query,
                    variables: {
                        first: 50,
                        after: cursor,
                        orderBy: 'updatedAt'
                    }
                },
                retries: 3
            });

            const roadmapsConnection = response.data?.data?.roadmaps;
            if (!roadmapsConnection) {
                throw new Error('Missing roadmaps data from Linear API; aborting to prevent incorrect delete reconciliation');
            }

            const nodes = roadmapsConnection.nodes ?? [];
            if (nodes.length === 0) {
                break;
            }

            const roadmaps = nodes.map(
                (node: {
                    id: string;
                    name?: string | null;
                    description?: string | null;
                    owner?: { id: string; name: string } | null;
                    projects?: { nodes: { id: string }[] } | null;
                    createdAt: string;
                    updatedAt: string;
                    archivedAt?: string | null;
                    sortOrder?: number | null;
                }) => ({
                    id: node.id,
                    name: node.name ?? null,
                    description: node.description ?? null,
                    ownerId: node.owner?.id ?? null,
                    ownerName: node.owner?.name ?? null,
                    projectIds: node.projects?.nodes.map((p) => p.id) ?? [],
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                    archivedAt: node.archivedAt ?? null,
                    sortOrder: node.sortOrder ?? null
                })
            );

            await nango.batchSave(roadmaps, 'Roadmap');

            const pageInfo: { hasNextPage?: boolean; endCursor?: string } = roadmapsConnection.pageInfo ?? {};
            const hasNextPage = pageInfo.hasNextPage ?? false;
            const endCursor = pageInfo.endCursor;

            if (roadmaps.length > 0) {
                const lastUpdatedAt = roadmaps[roadmaps.length - 1]?.updatedAt;
                if (lastUpdatedAt) {
                    updatedAfter = lastUpdatedAt;
                }
            }

            if (hasNextPage && endCursor) {
                cursor = endCursor;
                await nango.saveCheckpoint({
                    cursor,
                    updatedAfter: updatedAfter ?? ''
                });
                continue;
            }

            // No more pages - save final checkpoint with empty cursor
            if (updatedAfter) {
                await nango.saveCheckpoint({ cursor: '', updatedAfter: updatedAfter });
            }
            break;
        }

        await nango.trackDeletesEnd('Roadmap');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
