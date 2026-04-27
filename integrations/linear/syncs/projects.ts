import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string().optional(),
    status: z
        .object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            color: z.string().optional()
        })
        .optional(),
    progress: z.number().optional(),
    startDate: z.string().optional(),
    targetDate: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lead: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    teams: z
        .array(
            z.object({
                id: z.string(),
                key: z.string().optional(),
                name: z.string().optional()
            })
        )
        .optional()
});

const LinearProjectStatusSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    color: z.string().optional().nullable()
});

const LinearUserSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable()
});

const LinearTeamSchema = z.object({
    id: z.string(),
    key: z.string().optional(),
    name: z.string().optional()
});

const LinearProjectNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string().optional().nullable(),
    status: LinearProjectStatusSchema.nullable(),
    progress: z.number().nullable(),
    startDate: z.string().optional().nullable(),
    targetDate: z.string().optional().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lead: LinearUserSchema.nullable(),
    teams: z
        .object({
            nodes: z.array(LinearTeamSchema).optional()
        })
        .nullable()
});

const LinearProjectsResponseSchema = z.object({
    data: z.object({
        projects: z.object({
            nodes: z.array(LinearProjectNodeSchema),
            pageInfo: z.object({
                hasNextPage: z.boolean(),
                endCursor: z.string().optional().nullable()
            })
        })
    })
});

const sync = createSync({
    description: 'Sync Linear projects with lead, status, and progress fields',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Project: ProjectSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/projects'
        }
    ],
    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = CheckpointSchema.safeParse(rawCheckpoint ?? { updated_after: '' });
        if (!checkpointParse.success) {
            await nango.log('Invalid checkpoint', { error: checkpointParse.error.format() });
            throw new Error('Invalid checkpoint');
        }
        const checkpoint = checkpointParse.data;

        let hasNextPage = true;
        let endCursor: string | undefined;
        let firstUpdatedAt: string | undefined;

        while (hasNextPage) {
            const variables: {
                first: number;
                orderBy: string;
                after?: string;
                filter?: { updatedAt?: { gte: string } };
            } = {
                first: 50,
                orderBy: 'updatedAt',
                ...(endCursor && { after: endCursor }),
                ...(checkpoint.updated_after && { filter: { updatedAt: { gte: checkpoint.updated_after } } })
            };

            const response = await nango.post({
                // https://linear.app/developers
                endpoint: '/graphql',
                data: {
                    query: `
                        query Projects($filter: ProjectFilter, $first: Int, $after: String, $orderBy: PaginationOrderBy) {
                            projects(filter: $filter, first: $first, after: $after, orderBy: $orderBy) {
                                nodes {
                                    id
                                    name
                                    state
                                    status {
                                        id
                                        name
                                        type
                                        color
                                    }
                                    progress
                                    startDate
                                    targetDate
                                    createdAt
                                    updatedAt
                                    lead {
                                        id
                                        name
                                        email
                                    }
                                    teams {
                                        nodes {
                                            id
                                            key
                                            name
                                        }
                                    }
                                }
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                            }
                        }
                    `,
                    variables
                },
                retries: 3
            });

            const data: unknown = response.data;
            const parsed = LinearProjectsResponseSchema.safeParse(data);
            if (!parsed.success) {
                await nango.log('Unexpected Linear projects response', { error: parsed.error.format() });
                throw new Error('Unexpected Linear projects response structure');
            }

            const nodes = parsed.data.data.projects.nodes;
            const pageInfo = parsed.data.data.projects.pageInfo;

            if (!Array.isArray(nodes)) {
                throw new Error('Linear projects nodes is not an array');
            }

            if (nodes.length === 0) {
                hasNextPage = false;
                continue;
            }

            const projects = nodes.map((node) => ({
                id: node.id,
                name: node.name,
                ...(node.state != null && { state: node.state }),
                ...(node.status != null && {
                    status: {
                        id: node.status.id,
                        name: node.status.name,
                        type: node.status.type,
                        ...(node.status.color != null && { color: node.status.color })
                    }
                }),
                ...(node.progress != null && { progress: node.progress }),
                ...(node.startDate != null && { startDate: node.startDate }),
                ...(node.targetDate != null && { targetDate: node.targetDate }),
                createdAt: node.createdAt,
                updatedAt: node.updatedAt,
                ...(node.lead != null && {
                    lead: {
                        id: node.lead.id,
                        ...(node.lead.name != null && { name: node.lead.name }),
                        ...(node.lead.email != null && { email: node.lead.email })
                    }
                }),
                ...(node.teams?.nodes != null && {
                    teams: node.teams.nodes.map((team) => ({
                        id: team.id,
                        ...(team.key != null && { key: team.key }),
                        ...(team.name != null && { name: team.name })
                    }))
                })
            }));

            await nango.batchSave(projects, 'Project');

            const firstNode = nodes[0];
            if (!firstUpdatedAt && firstNode) {
                firstUpdatedAt = firstNode.updatedAt;
            }

            hasNextPage = pageInfo.hasNextPage;
            endCursor = pageInfo.endCursor ?? undefined;

            if (!hasNextPage || !endCursor) {
                hasNextPage = false;
            }
        }

        if (firstUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: firstUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
