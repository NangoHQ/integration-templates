import { createSync } from 'nango';
import { z } from 'zod';

// https://developers.linear.app/docs/graphql/working-with-the-graphql-api/pagination
const RoadmapSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    owner_id: z.union([z.string(), z.null()]),
    owner_name: z.union([z.string(), z.null()]),
    project_ids: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.union([z.string(), z.null()]),
    sort_order: z.union([z.number(), z.null()])
});

// Checkpoint: cursor for pagination + updated_after for incremental syncs
// Note: CheckpointSchema values must be ZodString | ZodNumber | ZodBoolean only
const CheckpointSchema = z.object({
    cursor: z.string(),
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync Linear roadmaps and their project relationships',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Roadmap: RoadmapSchema
    },
    endpoints: [
        {
            path: '/syncs/sync-roadmaps',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Blocker: Linear GraphQL API does not expose deleted roadmap events
        // or a changed-since endpoint for roadmaps. Full refresh is required
        // for deletion detection on the initial run or when checkpoint is reset.
        await nango.trackDeletesStart('Roadmap');

        let cursor: string | undefined = checkpoint?.['cursor'] || undefined;
        let updatedAfter: string | undefined = checkpoint?.['updated_after'] || undefined;
        let firstBatchSaved = false;

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
                break;
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
                    owner_id: node.owner?.id ?? null,
                    owner_name: node.owner?.name ?? null,
                    project_ids: node.projects?.nodes.map((p) => p.id) ?? [],
                    created_at: node.createdAt,
                    updated_at: node.updatedAt,
                    archived_at: node.archivedAt ?? null,
                    sort_order: node.sortOrder ?? null
                })
            );

            await nango.batchSave(roadmaps, 'Roadmap');

            const pageInfo: { hasNextPage?: boolean; endCursor?: string } = roadmapsConnection.pageInfo ?? {};
            const hasNextPage = pageInfo.hasNextPage ?? false;
            const endCursor = pageInfo.endCursor;

            if (roadmaps.length > 0) {
                const lastUpdatedAt = roadmaps[roadmaps.length - 1]?.updated_at;
                if (lastUpdatedAt) {
                    updatedAfter = lastUpdatedAt;
                }
            }

            if (hasNextPage && endCursor) {
                cursor = endCursor;
                await nango.saveCheckpoint({
                    cursor,
                    updated_after: updatedAfter ?? ''
                });
                firstBatchSaved = true;
                continue;
            }

            // No more pages - save final checkpoint with empty cursor
            if (updatedAfter) {
                await nango.saveCheckpoint({ cursor: '', updated_after: updatedAfter });
            }
            firstBatchSaved = true;
            break;
        }

        // Only mark deletes if we actually processed data (to avoid wiping on API errors)
        if (firstBatchSaved) {
            await nango.trackDeletesEnd('Roadmap');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
