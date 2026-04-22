import { createSync } from 'nango';
import { z } from 'zod';

const MilestoneSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.union([z.string(), z.null()]),
    status: z.string(),
    progress: z.number(),
    target_date: z.union([z.string(), z.null()]),
    project_id: z.union([z.string(), z.null()]),
    updated_at: z.string(),
    created_at: z.string(),
    archived_at: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

interface MilestoneNode {
    id: string;
    name: string;
    description: string | null;
    status: string;
    progress: number;
    targetDate: string | null;
    project: { id: string } | null;
    updatedAt: string;
    createdAt: string;
    archivedAt: string | null;
}

interface MilestonesResponse {
    data?: {
        projectMilestones?: {
            edges: Array<{ node: MilestoneNode; cursor: string }>;
            pageInfo: {
                hasNextPage: boolean;
                endCursor: string | null;
            };
        };
    };
}

const sync = createSync({
    description: 'Sync Linear milestones for project planning',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Milestone: MilestoneSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/sync-milestones'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint ? checkpoint['updated_after'] : '';
        // Do not resume from a mid-pagination cursor: trackDeletesEnd requires a
        // complete scan, so every run must start from page 1.
        let cursor = '';

        await nango.trackDeletesStart('Milestone');

        const pageSize = 100;

        while (true) {
            const query = `
                query ProjectMilestones($first: Int, $after: String) {
                    projectMilestones(
                        first: $first,
                        after: $after
                    ) {
                        edges {
                            node {
                                id
                                name
                                description
                                status
                                progress
                                targetDate
                                project {
                                    id
                                }
                                updatedAt
                                createdAt
                                archivedAt
                            }
                            cursor
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            `;

            const variables: { first: number; after?: string } = {
                first: pageSize
            };

            if (cursor) {
                variables.after = cursor;
            }

            // https://linear.app/developers
            const response = await nango.post<MilestonesResponse>({
                endpoint: '/graphql',
                data: {
                    query,
                    variables
                },
                retries: 3
            });

            const milestonesData = response.data?.data?.projectMilestones;

            if (!milestonesData) {
                throw new Error('Missing projectMilestones data from Linear API; aborting to prevent incorrect delete reconciliation');
            }

            if (milestonesData.edges.length === 0) {
                break;
            }

            const milestones = milestonesData.edges.map((edge) => ({
                id: edge.node.id,
                name: edge.node.name,
                description: edge.node.description,
                status: edge.node.status,
                progress: edge.node.progress,
                target_date: edge.node.targetDate,
                project_id: edge.node.project?.id ?? null,
                updated_at: edge.node.updatedAt,
                created_at: edge.node.createdAt,
                archived_at: edge.node.archivedAt
            }));

            await nango.batchSave(milestones, 'Milestone');

            const hasNextPage = milestonesData.pageInfo.hasNextPage;
            const endCursor = milestonesData.pageInfo.endCursor;

            if (hasNextPage && endCursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    cursor: endCursor
                });
                cursor = endCursor;
            } else {
                const lastMilestone = milestones[milestones.length - 1];
                if (lastMilestone) {
                    await nango.saveCheckpoint({
                        updated_after: lastMilestone.updated_at,
                        cursor: ''
                    });
                }
                break;
            }
        }

        await nango.trackDeletesEnd('Milestone');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
