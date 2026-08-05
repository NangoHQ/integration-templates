import { createSync } from 'nango';
import { z } from 'zod';

const TeamSchema = z.object({
    id: z.string(),
    key: z.string().optional(),
    name: z.string().optional()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    state: z.string().optional(),
    statusId: z.string().optional(),
    statusName: z.string().optional(),
    progress: z.number().optional(),
    scope: z.number().optional(),
    leadId: z.string().optional(),
    leadName: z.string().optional(),
    leadEmail: z.string().optional(),
    startDate: z.string().optional(),
    targetDate: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().optional(),
    trashed: z.boolean().optional(),
    url: z.string().optional(),
    slugId: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    teams: z.array(TeamSchema).optional()
});

const LeadSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().optional()
    })
    .nullable();

const StatusSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .nullable();

const ProjectNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullish(),
    state: z.string().nullish(),
    status: StatusSchema,
    progress: z.number().nullish(),
    scope: z.number().nullish(),
    lead: LeadSchema,
    startDate: z.string().nullish(),
    targetDate: z.string().nullish(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().nullish(),
    trashed: z.boolean().nullish(),
    url: z.string().nullish(),
    slugId: z.string().nullish(),
    color: z.string().nullish(),
    icon: z.string().nullish(),
    teams: z
        .object({
            nodes: z.array(TeamSchema)
        })
        .nullish()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullish()
});

const ProjectsResponseSchema = z.object({
    data: z.object({
        projects: z.object({
            nodes: z.array(ProjectNodeSchema),
            pageInfo: PageInfoSchema
        })
    })
});

const sync = createSync({
    description: 'Sync Linear projects with lead, status, and progress fields',
    version: '3.0.3',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['read'],
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/projects'
        }
    ],
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        // Full refresh on every run (no `updatedAt.gte` filter): `trackDeletes` infers deletions from the
        // records absent in this run, so it must see the complete project set or it would delete everything
        // outside an incremental window.
        const limit = 100;
        let after: string | undefined;
        let hasNext = true;
        let deleteTrackingStarted = false;

        while (hasNext) {
            const variables: Record<string, unknown> = {
                first: limit
            };
            if (after !== undefined) {
                variables['after'] = after;
            }

            // https://linear.app/developers/graphql
            const response = await nango.post({
                endpoint: '/graphql',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    query: `
                        query Projects($first: Int, $after: String) {
                            projects(first: $first, after: $after) {
                                nodes {
                                    id
                                    name
                                    description
                                    state
                                    status {
                                        id
                                        name
                                    }
                                    progress
                                    scope
                                    lead {
                                        id
                                        name
                                        email
                                    }
                                    startDate
                                    targetDate
                                    createdAt
                                    updatedAt
                                    archivedAt
                                    trashed
                                    url
                                    slugId
                                    color
                                    icon
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

            const parsed = ProjectsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error('Invalid GraphQL response structure: ' + parsed.error.message);
            }

            const { nodes, pageInfo } = parsed.data.data.projects;

            // Only open delete tracking once the first page has been fetched and validated, so a failing
            // request or response never leaves tracking open with nothing saved against it.
            if (!deleteTrackingStarted) {
                await nango.trackDeletesStart('Project');
                deleteTrackingStarted = true;
            }

            const projects = nodes.map((node) => {
                const lead = node.lead;
                const status = node.status;
                return {
                    id: node.id,
                    name: node.name,
                    ...(node.description != null && { description: node.description }),
                    ...(node.state != null && { state: node.state }),
                    ...(status?.id != null && { statusId: status.id }),
                    ...(status?.name != null && { statusName: status.name }),
                    ...(node.progress != null && { progress: node.progress }),
                    ...(node.scope != null && { scope: node.scope }),
                    ...(lead?.id != null && { leadId: lead.id }),
                    ...(lead?.name != null && { leadName: lead.name }),
                    ...(lead?.email != null && { leadEmail: lead.email }),
                    ...(node.startDate != null && { startDate: node.startDate }),
                    ...(node.targetDate != null && { targetDate: node.targetDate }),
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                    ...(node.archivedAt != null && { archivedAt: node.archivedAt }),
                    ...(node.trashed != null && { trashed: node.trashed }),
                    ...(node.url != null && { url: node.url }),
                    ...(node.slugId != null && { slugId: node.slugId }),
                    ...(node.color != null && { color: node.color }),
                    ...(node.icon != null && { icon: node.icon }),
                    ...(node.teams?.nodes != null && { teams: node.teams.nodes })
                };
            });

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }

            if (pageInfo.hasNextPage && pageInfo.endCursor == null) {
                // Stopping here would hand an incomplete project set to delete tracking, which would delete
                // every project on the pages we never fetched. Fail the run instead.
                throw new Error('Inconsistent Linear pagination state: hasNextPage is true but endCursor is missing');
            }

            hasNext = pageInfo.hasNextPage;
            if (hasNext) {
                after = pageInfo.endCursor ?? undefined;
            }
        }

        if (deleteTrackingStarted) {
            await nango.trackDeletesEnd('Project');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
