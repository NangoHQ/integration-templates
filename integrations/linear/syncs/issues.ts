import { createSync } from 'nango';
import { z } from 'zod';

const LabelSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    color: z.string().optional()
});

const StateSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    color: z.string().optional()
});

const UserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const CycleSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const ProviderIssueSchema = z.object({
    id: z.string(),
    identifier: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    state: StateSchema.nullable().optional(),
    assignee: UserSchema.nullable().optional(),
    labels: z
        .object({
            nodes: z.array(LabelSchema).optional()
        })
        .nullable()
        .optional(),
    project: ProjectSchema.nullable().optional(),
    cycle: CycleSchema.nullable().optional(),
    updatedAt: z.string(),
    createdAt: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    priority: z.number().nullable().optional()
});

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    state: StateSchema.optional(),
    assignee: UserSchema.optional(),
    labels: z.array(LabelSchema).optional(),
    project: ProjectSchema.optional(),
    cycle: CycleSchema.optional(),
    updatedAt: z.string(),
    createdAt: z.string().optional(),
    url: z.string().optional(),
    priority: z.number().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string(),
    first_page_high_water_mark: z.string()
});

const sync = createSync({
    description: 'Sync Linear issues with state, assignee, labels, project, and cycle data.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/issues'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Issue: IssueSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let cursor = checkpoint?.cursor ?? '';
        const updatedAfter = checkpoint?.updated_after ?? '';
        let firstPageHighWaterMark = checkpoint?.first_page_high_water_mark ?? '';

        const metadata = await nango.getMetadata();
        const MetadataSchema = z
            .object({
                teamId: z.union([z.string(), z.number()]).optional(),
                projectId: z.union([z.string(), z.number()]).optional()
            })
            .optional();
        const parsedMetadata = metadata !== null ? MetadataSchema.parse(metadata) : undefined;
        const teamId = parsedMetadata?.teamId !== undefined ? String(parsedMetadata.teamId) : undefined;
        const projectId = parsedMetadata?.projectId !== undefined ? String(parsedMetadata.projectId) : undefined;

        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const filter: Record<string, unknown> = {};
            if (updatedAfter !== '') {
                filter['updatedAt'] = { gte: updatedAfter };
            }
            if (teamId !== undefined) {
                filter['team'] = { id: { eq: teamId } };
            }
            if (projectId !== undefined) {
                filter['project'] = { id: { eq: projectId } };
            }

            const variables = {
                filter: Object.keys(filter).length > 0 ? filter : undefined,
                orderBy: 'updatedAt',
                first: 50,
                after: cursor === '' ? undefined : cursor
            };

            const query = `
                query Issues($filter: IssueFilter, $orderBy: PaginationOrderBy, $first: Int, $after: String) {
                    issues(filter: $filter, orderBy: $orderBy, first: $first, after: $after) {
                        nodes {
                            id
                            identifier
                            title
                            description
                            state {
                                id
                                name
                                color
                            }
                            assignee {
                                id
                                name
                                email
                            }
                            labels {
                                nodes {
                                    id
                                    name
                                    color
                                }
                            }
                            project {
                                id
                                name
                            }
                            cycle {
                                id
                                name
                            }
                            updatedAt
                            createdAt
                            url
                            priority
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            `;

            // https://linear.app/developers/api/graphql
            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query,
                    variables
                },
                retries: 3
            });

            const ResponseSchema = z.object({
                data: z.object({
                    issues: z.object({
                        nodes: z.array(z.unknown()),
                        pageInfo: z.object({
                            hasNextPage: z.boolean(),
                            endCursor: z.string().optional().nullable()
                        })
                    })
                })
            });

            const parsedResponse = ResponseSchema.parse(response.data);
            const issues = parsedResponse.data.issues.nodes;
            const pageInfo = parsedResponse.data.issues.pageInfo;

            if (!Array.isArray(issues)) {
                throw new Error('Expected issues.nodes to be an array');
            }

            if (issues.length === 0) {
                break;
            }

            const mappedIssues = issues.map((issue) => {
                const record = ProviderIssueSchema.parse(issue);
                return {
                    id: record.id,
                    ...(record.identifier != null && { identifier: record.identifier }),
                    ...(record.title != null && { title: record.title }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.state != null && { state: record.state }),
                    ...(record.assignee != null && { assignee: record.assignee }),
                    ...(record.labels != null && { labels: record.labels.nodes }),
                    ...(record.project != null && { project: record.project }),
                    ...(record.cycle != null && { cycle: record.cycle }),
                    updatedAt: record.updatedAt,
                    ...(record.createdAt != null && { createdAt: record.createdAt }),
                    ...(record.url != null && { url: record.url }),
                    ...(record.priority != null && { priority: record.priority })
                };
            });

            await nango.batchSave(mappedIssues, 'Issue');

            if (cursor === '' && issues.length > 0) {
                const firstIssue = issues[0];
                if (typeof firstIssue === 'object' && firstIssue !== null && 'updatedAt' in firstIssue && typeof firstIssue.updatedAt === 'string') {
                    firstPageHighWaterMark = firstIssue.updatedAt;
                }
            }

            if (!pageInfo.hasNextPage || !pageInfo.endCursor) {
                break;
            }

            cursor = pageInfo.endCursor;

            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                cursor: cursor,
                first_page_high_water_mark: firstPageHighWaterMark
            });
        }

        if (firstPageHighWaterMark !== '') {
            await nango.saveCheckpoint({
                updated_after: firstPageHighWaterMark,
                cursor: '',
                first_page_high_water_mark: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
