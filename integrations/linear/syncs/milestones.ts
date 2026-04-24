import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const MilestoneSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    progress: z.number().optional(),
    status: z.string().optional(),
    targetDate: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    project: ProjectSchema.optional()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().optional().nullable()
});

const ProjectMilestoneConnectionSchema = z.object({
    nodes: z.array(
        z.object({
            id: z.string(),
            name: z.string().optional().nullable(),
            description: z.string().optional().nullable(),
            progress: z.number().optional().nullable(),
            status: z.string().optional().nullable(),
            targetDate: z.string().optional().nullable(),
            createdAt: z.string(),
            updatedAt: z.string(),
            project: z
                .object({
                    id: z.string(),
                    name: z.string().optional().nullable()
                })
                .optional()
                .nullable()
        })
    ),
    pageInfo: PageInfoSchema
});

const ResponseSchema = z.object({
    data: z.object({
        projectMilestones: ProjectMilestoneConnectionSchema
    })
});

type MilestonesVariables = {
    first: number;
    after: string | null;
    orderBy: string;
    filter?: {
        updatedAt: {
            gte: string;
        };
    };
};

const sync = createSync({
    description: 'Sync Linear milestones for project planning.',
    version: '1.0.0',
    frequency: 'every 6min',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/milestones'
        }
    ],
    models: {
        Milestone: MilestoneSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        if (rawCheckpoint) {
            CheckpointSchema.parse(rawCheckpoint);
        }
        const updatedAfter = rawCheckpoint?.updatedAfter;
        const pageSize = 100;
        let hasMore = true;
        let after: string | undefined;
        let highWaterMark: string | undefined;

        while (hasMore) {
            const variables: MilestonesVariables = {
                first: pageSize,
                after: after || null,
                orderBy: 'updatedAt'
            };

            if (updatedAfter) {
                variables.filter = {
                    updatedAt: {
                        gte: updatedAfter
                    }
                };
            }

            const query = `
                query ProjectMilestones($first: Int!, $after: String, $filter: ProjectMilestoneFilter, $orderBy: PaginationOrderBy) {
                    projectMilestones(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                        nodes {
                            id
                            name
                            description
                            progress
                            status
                            targetDate
                            createdAt
                            updatedAt
                            project {
                                id
                                name
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            `;

            const config: ProxyConfiguration = {
                // https://linear.app/developers/docs/graphql/working-with-the-graphql-api
                endpoint: '/graphql',
                data: {
                    query,
                    variables
                },
                retries: 3
            };

            // https://linear.app/developers/docs/graphql/working-with-the-graphql-api
            const response = await nango.post(config);

            const parsed = ResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error('Unexpected response shape: ' + parsed.error.message);
            }

            const connection = parsed.data.data.projectMilestones;
            const milestones = connection.nodes.map((record) => ({
                id: record.id,
                ...(record.name != null && { name: record.name }),
                ...(record.description != null && { description: record.description }),
                ...(record.progress != null && { progress: record.progress }),
                ...(record.status != null && { status: record.status }),
                ...(record.targetDate != null && { targetDate: record.targetDate }),
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
                ...(record.project != null && {
                    project: {
                        id: record.project.id,
                        ...(record.project.name != null && { name: record.project.name })
                    }
                })
            }));

            if (milestones.length === 0) {
                if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) {
                    hasMore = false;
                } else {
                    after = connection.pageInfo.endCursor || undefined;
                }
                continue;
            }

            await nango.batchSave(milestones, 'Milestone');

            const firstRecord = milestones[0];
            if (!highWaterMark && firstRecord) {
                highWaterMark = firstRecord.updatedAt;
            }

            if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) {
                hasMore = false;
            } else {
                after = connection.pageInfo.endCursor || undefined;
            }
        }

        if (highWaterMark) {
            await nango.saveCheckpoint({
                updatedAfter: highWaterMark
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
