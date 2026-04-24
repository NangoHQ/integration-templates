import { createSync } from 'nango';
import { z } from 'zod';

const RoadmapSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    updatedAt: z.string(),
    createdAt: z.string(),
    archivedAt: z.string().optional(),
    color: z.string().optional(),
    slugId: z.string(),
    sortOrder: z.number(),
    url: z.string(),
    creatorId: z.string().optional(),
    ownerId: z.string().optional(),
    projectIds: z.array(z.string()),
    teamIds: z.array(z.string())
});

const RoadmapNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullish(),
    updatedAt: z.string(),
    createdAt: z.string(),
    archivedAt: z.string().nullish(),
    color: z.string().nullish(),
    slugId: z.string(),
    sortOrder: z.number(),
    url: z.string(),
    creator: z.object({ id: z.string() }).nullish(),
    owner: z.object({ id: z.string() }).nullish(),
    projects: z
        .object({
            nodes: z
                .array(
                    z.object({
                        id: z.string()
                    })
                )
                .nullish()
        })
        .nullish()
});

const RoadmapsResponseSchema = z.object({
    data: z
        .object({
            roadmaps: z
                .object({
                    nodes: z.array(RoadmapNodeSchema).nullish(),
                    pageInfo: z
                        .object({
                            hasNextPage: z.boolean().nullish(),
                            endCursor: z.string().nullish()
                        })
                        .nullish()
                })
                .nullish()
        })
        .nullish()
});

const sync = createSync({
    description: 'Sync Linear roadmaps and their project relationships.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/roadmaps'
        }
    ],
    models: {
        Roadmap: RoadmapSchema
    },

    exec: async (nango) => {
        // Blocker: The Linear GraphQL roadmaps query does not accept a filter
        // argument for updatedAt, so incremental filtering is not possible.
        await nango.trackDeletesStart('Roadmap');

        let cursor: string | undefined;
        let hasNextPage = true;

        while (hasNextPage) {
            // https://linear.app/developers/graphql
            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: `
                        query Roadmaps($after: String, $orderBy: PaginationOrderBy) {
                            roadmaps(after: $after, first: 50, orderBy: $orderBy) {
                                nodes {
                                    id
                                    name
                                    description
                                    updatedAt
                                    createdAt
                                    archivedAt
                                    color
                                    slugId
                                    sortOrder
                                    url
                                    creator {
                                        id
                                    }
                                    owner {
                                        id
                                    }
                                    projects {
                                        nodes {
                                            id
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
                    variables: {
                        after: cursor || null,
                        orderBy: 'updatedAt'
                    }
                },
                retries: 3
            });

            const parsed = RoadmapsResponseSchema.parse(response.data);
            const roadmapsData = parsed.data?.roadmaps;

            if (!roadmapsData || !Array.isArray(roadmapsData.nodes)) {
                throw new Error('Missing or invalid roadmaps data from Linear API');
            }

            const nodes = roadmapsData.nodes;
            if (nodes.length === 0) {
                break;
            }

            const roadmaps = nodes.map((node) => {
                const projectIds: string[] = [];

                const projectsNodes = node.projects?.nodes;
                if (Array.isArray(projectsNodes)) {
                    for (const project of projectsNodes) {
                        if (project?.id) {
                            projectIds.push(project.id);
                        }
                    }
                }

                return {
                    id: node.id,
                    name: node.name,
                    ...(node.description != null && { description: node.description }),
                    updatedAt: node.updatedAt,
                    createdAt: node.createdAt,
                    ...(node.archivedAt != null && { archivedAt: node.archivedAt }),
                    ...(node.color != null && { color: node.color }),
                    slugId: node.slugId,
                    sortOrder: node.sortOrder,
                    url: node.url,
                    ...(node.creator?.id != null && { creatorId: node.creator.id }),
                    ...(node.owner?.id != null && { ownerId: node.owner.id }),
                    projectIds: [...new Set(projectIds)],
                    teamIds: []
                };
            });

            await nango.batchSave(roadmaps, 'Roadmap');

            hasNextPage = Boolean(roadmapsData.pageInfo?.hasNextPage);
            cursor = roadmapsData.pageInfo?.endCursor || undefined;

            if (!hasNextPage || !cursor) {
                break;
            }
        }

        await nango.trackDeletesEnd('Roadmap');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
