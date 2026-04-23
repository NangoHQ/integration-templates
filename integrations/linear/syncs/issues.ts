import { createSync } from 'nango';
import { z } from 'zod';

const IssueStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    type: z.string().optional()
});

const IssueAssigneeSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional()
});

const IssueLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional()
});

const IssueProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string().optional()
});

const IssueCycleSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    number: z.number().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional()
});

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.string().optional(),
    state: IssueStateSchema.optional(),
    assignee: IssueAssigneeSchema.optional(),
    labels: z.array(IssueLabelSchema).optional(),
    project: IssueProjectSchema.optional(),
    cycle: IssueCycleSchema.optional(),
    priority: z.number().optional(),
    estimate: z.number().optional(),
    dueDate: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    url: z.string()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string(),
    cursor: z.string()
});

const MetadataSchema = z.object({
    teamId: z.string().optional(),
    projectId: z.string().optional()
});

const IssueResponseSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.union([z.string(), z.null()]).optional(),
    priority: z.number().optional(),
    estimate: z.number().optional(),
    dueDate: z.union([z.string(), z.null()]).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    url: z.string(),
    state: z
        .object({
            id: z.string(),
            name: z.string(),
            color: z.string().optional(),
            type: z.string().optional()
        })
        .optional()
        .nullable(),
    assignee: z
        .object({
            id: z.string(),
            name: z.string(),
            email: z.string().optional()
        })
        .optional()
        .nullable(),
    labels: z
        .object({
            nodes: z.array(
                z.object({
                    id: z.string(),
                    name: z.string(),
                    color: z.string().optional()
                })
            )
        })
        .optional()
        .nullable(),
    project: z
        .object({
            id: z.string(),
            name: z.string(),
            state: z.string().optional()
        })
        .optional()
        .nullable(),
    cycle: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            number: z.number().optional(),
            startsAt: z.string().optional(),
            endsAt: z.string().optional()
        })
        .optional()
        .nullable()
});

const sync = createSync({
    description: 'Sync Linear issues with state, assignee, labels, project, and cycle data.',
    version: '3.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        Issue: IssueSchema
    },
    endpoints: [{ path: '/syncs/issues', method: 'POST' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const connection = await nango.getConnection();
        const metadata = 'metadata' in connection ? connection.metadata : undefined;
        const validatedMetadata = MetadataSchema.safeParse(metadata);

        const updatedAfter = checkpoint?.updatedAfter || '';
        const teamId = validatedMetadata.success ? validatedMetadata.data.teamId : undefined;
        const projectId = validatedMetadata.success ? validatedMetadata.data.projectId : undefined;

        const issuesQuery = `
            query Issues(
                $after: String,
                $filter: IssueFilter,
                $first: Int
            ) {
                issues(
                    after: $after,
                    filter: $filter,
                    first: $first,
                    orderBy: updatedAt
                ) {
                    nodes {
                        id
                        identifier
                        title
                        description
                        priority
                        estimate
                        dueDate
                        createdAt
                        updatedAt
                        url
                        state {
                            id
                            name
                            color
                            type
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
                            state
                        }
                        cycle {
                            id
                            name
                            number
                            startsAt
                            endsAt
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const buildFilter = (): Record<string, unknown> => {
            const filter: Record<string, unknown> = {};
            if (updatedAfter) {
                filter['updatedAt'] = { gt: updatedAfter };
            }
            if (teamId) {
                filter['team'] = { id: { eq: teamId } };
            }
            if (projectId) {
                filter['project'] = { id: { eq: projectId } };
            }
            return filter;
        };

        // https://linear.app/developers
        const first = 100;
        let hasNextPage = true;
        let after: string | null = checkpoint?.cursor || null;
        let lastUpdatedAt = updatedAfter;

        while (hasNextPage) {
            const variables: {
                first: number;
                filter: Record<string, unknown>;
                after?: string;
            } = {
                first,
                filter: buildFilter()
            };
            if (after) {
                variables.after = after;
            }

            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: issuesQuery,
                    variables
                },
                retries: 3
            });

            type IssuesResponse = {
                data?: {
                    issues?: {
                        nodes: Array<unknown>;
                        pageInfo?: {
                            hasNextPage: boolean;
                            endCursor?: string;
                        };
                    };
                };
            };

            const responseData: IssuesResponse = response.data;
            const issuesConnection = responseData.data?.issues;
            if (!issuesConnection) {
                throw new Error('Linear issues response did not include an issues connection');
            }

            const issuesNodes = issuesConnection.nodes;
            const pageInfo = issuesConnection.pageInfo;

            if (!pageInfo) {
                throw new Error('Linear issues response did not include pagination info');
            }

            if (issuesNodes.length === 0) {
                await nango.saveCheckpoint({
                    updatedAfter: updatedAfter,
                    cursor: ''
                });
                break;
            }

            const issues = [];
            for (const rawIssue of issuesNodes) {
                const parsed = IssueResponseSchema.safeParse(rawIssue);
                if (!parsed.success) {
                    continue;
                }
                const issue = parsed.data;
                issues.push({
                    id: issue.id,
                    identifier: issue.identifier,
                    title: issue.title,
                    description: issue.description ?? undefined,
                    state: issue.state
                        ? {
                              id: issue.state.id,
                              name: issue.state.name,
                              color: issue.state.color,
                              type: issue.state.type
                          }
                        : undefined,
                    assignee: issue.assignee
                        ? {
                              id: issue.assignee.id,
                              name: issue.assignee.name,
                              email: issue.assignee.email
                          }
                        : undefined,
                    labels: issue.labels?.nodes.map((label) => ({
                        id: label.id,
                        name: label.name,
                        color: label.color
                    })),
                    project: issue.project
                        ? {
                              id: issue.project.id,
                              name: issue.project.name,
                              state: issue.project.state
                          }
                        : undefined,
                    cycle: issue.cycle
                        ? {
                              id: issue.cycle.id,
                              name: issue.cycle.name,
                              number: issue.cycle.number,
                              startsAt: issue.cycle.startsAt,
                              endsAt: issue.cycle.endsAt
                          }
                        : undefined,
                    priority: issue.priority,
                    estimate: issue.estimate,
                    dueDate: issue.dueDate ?? undefined,
                    createdAt: issue.createdAt,
                    updatedAt: issue.updatedAt,
                    url: issue.url
                });
            }

            if (issues.length > 0) {
                await nango.batchSave(issues, 'Issue');

                // Advance the lower bound only after the whole updatedAt window finishes.
                const lastIssue = issues[issues.length - 1];
                if (lastIssue) {
                    lastUpdatedAt = lastIssue.updatedAt;
                }
            }

            hasNextPage = pageInfo.hasNextPage;
            after = pageInfo.endCursor || null;

            if (hasNextPage) {
                if (!after) {
                    throw new Error('Linear issues pagination indicated more pages without an end cursor');
                }

                await nango.saveCheckpoint({
                    updatedAfter: updatedAfter,
                    cursor: after
                });
                continue;
            }

            await nango.saveCheckpoint({
                updatedAfter: lastUpdatedAt,
                cursor: ''
            });
            break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
