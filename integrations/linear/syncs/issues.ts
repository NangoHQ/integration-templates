import { createSync } from 'nango';
import { z } from 'zod';

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.string().optional(),
    updatedAt: z.string(),
    createdAt: z.string(),
    archivedAt: z.string().optional(),
    trashed: z.boolean().optional(),
    state: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    assignee: z
        .object({
            id: z.string(),
            name: z.string(),
            email: z.string().optional()
        })
        .optional(),
    team: z
        .object({
            id: z.string(),
            name: z.string(),
            key: z.string().optional()
        })
        .optional(),
    labels: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .optional(),
    project: z
        .object({
            id: z.string(),
            name: z.string(),
            state: z.string().optional()
        })
        .optional(),
    cycle: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    url: z.string().optional(),
    priority: z.number().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string(),
    first_page_high_water_mark: z.string()
});

const LinearLabelSchema = z.object({
    id: z.string(),
    name: z.string()
});

const LinearStateSchema = z.object({
    id: z.string(),
    name: z.string()
});

const LinearAssigneeSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable().optional()
});

const LinearTeamSchema = z.object({
    id: z.string(),
    name: z.string(),
    key: z.string().nullable().optional()
});

const LinearLabelsConnectionSchema = z.object({
    nodes: z.array(LinearLabelSchema).optional()
});

const LinearProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string().nullable().optional()
});

const LinearCycleSchema = z.object({
    id: z.string(),
    name: z.string()
});

const LinearIssueNodeSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    updatedAt: z.string(),
    createdAt: z.string(),
    archivedAt: z.string().nullable().optional(),
    trashed: z.boolean().nullable().optional(),
    state: LinearStateSchema.nullable().optional(),
    assignee: LinearAssigneeSchema.nullable().optional(),
    team: LinearTeamSchema.nullable().optional(),
    labels: LinearLabelsConnectionSchema.nullable().optional(),
    project: LinearProjectSchema.nullable().optional(),
    cycle: LinearCycleSchema.nullable().optional(),
    url: z.string().nullable().optional(),
    priority: z.number().nullable().optional()
});

const LinearPageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const LinearIssuesResponseSchema = z.object({
    data: z.object({
        issues: z.object({
            nodes: z.array(LinearIssueNodeSchema),
            pageInfo: LinearPageInfoSchema
        })
    })
});

const sync = createSync({
    description: 'Sync Linear issues with state, assignee, labels, project, and cycle data.',
    version: '3.0.2',
    frequency: 'every 5 minutes',
    autoStart: true,
    scopes: ['read'],
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
        const cursor = typeof checkpoint?.cursor === 'string' && checkpoint.cursor.length > 0 ? checkpoint.cursor : undefined;
        const updatedAfter = typeof checkpoint?.updated_after === 'string' && checkpoint.updated_after.length > 0 ? checkpoint.updated_after : undefined;
        let hasNextPage = true;
        let nextCursor: string | undefined = cursor;
        let firstUpdatedAt: string | undefined =
            typeof checkpoint?.first_page_high_water_mark === 'string' && checkpoint.first_page_high_water_mark.length > 0
                ? checkpoint.first_page_high_water_mark
                : undefined;

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

        interface GraphQLVariables {
            after?: string;
            filter?: Record<string, unknown>;
        }

        while (hasNextPage) {
            const filter: Record<string, unknown> = {};
            if (updatedAfter) {
                filter['updatedAt'] = { gte: updatedAfter };
            }
            if (teamId !== undefined) {
                filter['team'] = { id: { eq: teamId } };
            }
            if (projectId !== undefined) {
                filter['project'] = { id: { eq: projectId } };
            }

            const variables: GraphQLVariables = {};
            if (Object.keys(filter).length > 0) {
                variables.filter = filter;
            }
            if (nextCursor) {
                variables.after = nextCursor;
            }

            // https://linear.app/developers
            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: `query Issues($after: String, $filter: IssueFilter) {
  issues(after: $after, first: 100, orderBy: updatedAt, filter: $filter) {
    nodes {
      id
      identifier
      title
      description
      updatedAt
      createdAt
      archivedAt
      trashed
      state { id name }
      assignee { id name email }
      team { id name key }
      labels { nodes { id name } }
      project { id name state }
      cycle { id name }
      url
      priority
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`,
                    variables
                },
                retries: 3
            });

            const parsed = LinearIssuesResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse Linear issues response: ${parsed.error.message}`);
            }

            const nodes = parsed.data.data.issues.nodes;
            if (nodes.length === 0) {
                break;
            }

            const firstNode = nodes[0];
            if (firstNode && firstUpdatedAt === undefined) {
                firstUpdatedAt = firstNode.updatedAt;
            }

            const mapped = nodes.map((node) => ({
                id: node.id,
                identifier: node.identifier,
                title: node.title,
                ...(node.description != null && { description: node.description }),
                updatedAt: node.updatedAt,
                createdAt: node.createdAt,
                ...(node.archivedAt != null && { archivedAt: node.archivedAt }),
                ...(node.trashed != null && { trashed: node.trashed }),
                ...(node.state != null && { state: { id: node.state.id, name: node.state.name } }),
                ...(node.assignee != null && {
                    assignee: {
                        id: node.assignee.id,
                        name: node.assignee.name,
                        ...(node.assignee.email != null && { email: node.assignee.email })
                    }
                }),
                ...(node.team != null && {
                    team: {
                        id: node.team.id,
                        name: node.team.name,
                        ...(node.team.key != null && { key: node.team.key })
                    }
                }),
                ...(node.labels != null && {
                    labels: (node.labels.nodes ?? []).map((label) => ({
                        id: label.id,
                        name: label.name
                    }))
                }),
                ...(node.project != null && {
                    project: {
                        id: node.project.id,
                        name: node.project.name,
                        ...(node.project.state != null && { state: node.project.state })
                    }
                }),
                ...(node.cycle != null && { cycle: { id: node.cycle.id, name: node.cycle.name } }),
                ...(node.url != null && { url: node.url }),
                ...(node.priority != null && { priority: node.priority })
            }));

            await nango.batchSave(mapped, 'Issue');

            const pageInfo = parsed.data.data.issues.pageInfo;
            if (pageInfo.hasNextPage && pageInfo.endCursor) {
                nextCursor = pageInfo.endCursor;
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    cursor: nextCursor,
                    first_page_high_water_mark: firstUpdatedAt ?? ''
                });
            } else {
                hasNextPage = false;
            }
        }

        if (firstUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: firstUpdatedAt, cursor: '', first_page_high_water_mark: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
