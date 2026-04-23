import { createSync } from 'nango';
import { z } from 'zod';

const MilestoneSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.union([z.string(), z.null()]),
    status: z.string(),
    progress: z.number(),
    targetDate: z.union([z.string(), z.null()]),
    projectId: z.union([z.string(), z.null()]),
    updatedAt: z.string(),
    createdAt: z.string(),
    archivedAt: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    updatedAfter: z.string(),
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
    version: '3.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Milestone: MilestoneSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/milestones'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint ? checkpoint['updatedAfter'] : '';
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
                targetDate: edge.node.targetDate,
                projectId: edge.node.project?.id ?? null,
                updatedAt: edge.node.updatedAt,
                createdAt: edge.node.createdAt,
                archivedAt: edge.node.archivedAt
            }));

            await nango.batchSave(milestones, 'Milestone');

            const hasNextPage = milestonesData.pageInfo.hasNextPage;
            const endCursor = milestonesData.pageInfo.endCursor;

            if (hasNextPage && endCursor) {
                await nango.saveCheckpoint({
                    updatedAfter: updatedAfter,
                    cursor: endCursor
                });
                cursor = endCursor;
            } else {
                const lastMilestone = milestones[milestones.length - 1];
                if (lastMilestone) {
                    await nango.saveCheckpoint({
                        updatedAfter: lastMilestone.updatedAt,
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
