import { createSync } from 'nango';
import { z } from 'zod';

// https://linear.app/developers/graphql
// https://linear.app/developers/pagination
// https://linear.app/developers/filtering

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.union([z.string(), z.null()]),
    slugId: z.string(),
    state: z.string(),
    progress: z.number(),
    scope: z.number(),
    health: z.union([z.string(), z.null()]),
    priority: z.number(),
    priorityLabel: z.union([z.string(), z.null()]),
    startDate: z.union([z.string(), z.null()]),
    targetDate: z.union([z.string(), z.null()]),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.union([z.string(), z.null()]),
    completedAt: z.union([z.string(), z.null()]),
    canceledAt: z.union([z.string(), z.null()]),
    startedAt: z.union([z.string(), z.null()]),
    leadId: z.union([z.string(), z.null()]),
    leadName: z.union([z.string(), z.null()]),
    leadEmail: z.union([z.string(), z.null()]),
    statusId: z.union([z.string(), z.null()]),
    statusName: z.union([z.string(), z.null()]),
    statusColor: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    updatedAfter: z.string(),
    cursor: z.string()
});

interface ProjectsResponse {
    data?: {
        projects?: {
            nodes?: Array<{
                id: string;
                name: string;
                description?: string | null;
                slugId: string;
                state: string;
                progress: number;
                scope: number;
                health?: string | null;
                priority: number;
                priorityLabel?: string | null;
                startDate?: string | null;
                targetDate?: string | null;
                createdAt: string;
                updatedAt: string;
                archivedAt?: string | null;
                completedAt?: string | null;
                canceledAt?: string | null;
                startedAt?: string | null;
                lead?: {
                    id: string;
                    name?: string;
                    email?: string;
                } | null;
                status?: {
                    id: string;
                    name: string;
                    color: string;
                } | null;
            }>;
            pageInfo?: {
                hasNextPage?: boolean;
                endCursor?: string | null;
            };
        };
    };
}

const sync = createSync({
    description: 'Sync Linear projects with lead, status, and progress fields',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Project: ProjectSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/sync-projects'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updatedAfter || '';
        let cursor = checkpoint?.cursor || '';

        // https://linear.app/developers/graphql
        // https://linear.app/developers/pagination
        // https://linear.app/developers/filtering
        const buildQuery = (cursorValue: string, filterValue: string) => {
            const afterArg = cursorValue ? `, after: "${cursorValue}"` : '';
            const filterArg = filterValue ? `, filter: { updatedAt: { gt: "${filterValue}" } }` : '';

            return `
                query Projects {
                    projects(first: 100${afterArg}${filterArg}, orderBy: updatedAt) {
                        nodes {
                            id
                            name
                            description
                            slugId
                            state
                            progress
                            scope
                            health
                            priority
                            priorityLabel
                            startDate
                            targetDate
                            createdAt
                            updatedAt
                            archivedAt
                            completedAt
                            canceledAt
                            startedAt
                            lead {
                                id
                                name
                                email
                            }
                            status {
                                id
                                name
                                color
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            `;
        };

        while (true) {
            // https://linear.app/developers/graphql
            const response = await nango.post<ProjectsResponse>({
                endpoint: '/graphql',
                data: {
                    query: buildQuery(cursor, updatedAfter)
                },
                retries: 3
            });

            const projectsData = response.data?.data?.projects;
            const nodes = projectsData?.nodes ?? [];
            const pageInfo = projectsData?.pageInfo;

            const projects = nodes.map((project) => ({
                id: project.id,
                name: project.name,
                description: project.description ?? null,
                slugId: project.slugId,
                state: project.state,
                progress: project.progress,
                scope: project.scope,
                health: project.health ?? null,
                priority: project.priority,
                priorityLabel: project.priorityLabel ?? null,
                startDate: project.startDate ?? null,
                targetDate: project.targetDate ?? null,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                archivedAt: project.archivedAt ?? null,
                completedAt: project.completedAt ?? null,
                canceledAt: project.canceledAt ?? null,
                startedAt: project.startedAt ?? null,
                leadId: project.lead?.id ?? null,
                leadName: project.lead?.name ?? null,
                leadEmail: project.lead?.email ?? null,
                statusId: project.status?.id ?? null,
                statusName: project.status?.name ?? null,
                statusColor: project.status?.color ?? null
            }));

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');

                const lastUpdatedAt = projects[projects.length - 1]?.updatedAt;

                if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
                    await nango.saveCheckpoint({
                        updatedAfter: updatedAfter,
                        cursor: pageInfo.endCursor
                    });
                    cursor = pageInfo.endCursor;
                    continue;
                }

                if (lastUpdatedAt) {
                    await nango.saveCheckpoint({
                        updatedAfter: lastUpdatedAt,
                        cursor: ''
                    });
                }
            }

            break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
