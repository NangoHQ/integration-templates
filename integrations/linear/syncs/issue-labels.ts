import { createSync } from 'nango';
import { z } from 'zod';

const IssueLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string(),
    teamId: z.string().optional()
});

const CheckpointSchema = z.looseObject({
    updated_after: z.string()
});

const MetadataSchema = z.object({
    teamId: z.string().optional()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().optional().nullable()
});

const IssueLabelNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    createdAt: z.string().optional().nullable(),
    updatedAt: z.string(),
    team: z
        .object({
            id: z.string()
        })
        .optional()
        .nullable()
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        issueLabels: z.object({
            nodes: z.array(IssueLabelNodeSchema).optional().nullable(),
            pageInfo: PageInfoSchema
        })
    })
});

type IssueLabelFilter = {
    updatedAt?: { gte: string };
    team?: { id: { eq: string } };
};

type IssueLabelsVariables = {
    first: number;
    after?: string;
    filter?: IssueLabelFilter;
};

const sync = createSync({
    description: 'Sync Linear issue labels across teams.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/issue-labels' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        IssueLabel: IssueLabelSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const updatedAfter =
            typeof rawCheckpoint === 'object' && rawCheckpoint !== null && 'updated_after' in rawCheckpoint && typeof rawCheckpoint.updated_after === 'string'
                ? rawCheckpoint.updated_after
                : undefined;

        const connection = await nango.getConnection();
        const rawMetadata = connection && typeof connection === 'object' && 'metadata' in connection ? connection['metadata'] : undefined;
        const metadata = MetadataSchema.parse(rawMetadata ?? {});

        const filter: IssueLabelFilter = {};
        if (updatedAfter) {
            filter.updatedAt = { gte: updatedAfter };
        }
        if (metadata.teamId) {
            filter.team = { id: { eq: metadata.teamId } };
        }

        let hasNextPage = true;
        let endCursor: string | undefined;
        let highWaterMark: string | undefined;

        while (hasNextPage) {
            const variables: IssueLabelsVariables = {
                first: 100
            };
            if (endCursor) {
                variables.after = endCursor;
            }
            if (Object.keys(filter).length > 0) {
                variables.filter = filter;
            }

            // https://linear.app/developers/graphql
            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: `
                        query IssueLabels($after: String, $filter: IssueLabelFilter) {
                            issueLabels(after: $after, first: 100, filter: $filter, orderBy: updatedAt) {
                                nodes {
                                    id
                                    name
                                    color
                                    description
                                    createdAt
                                    updatedAt
                                    team {
                                        id
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

            const parsed = GraphQLResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                await nango.log('Failed to parse issue labels response', parsed.error.format());
                throw new Error('Invalid issue labels response structure');
            }

            const nodes = parsed.data.data.issueLabels.nodes;
            const pageInfo = parsed.data.data.issueLabels.pageInfo;

            if (!Array.isArray(nodes)) {
                throw new Error('Expected issueLabels.nodes to be an array');
            }

            if (nodes.length === 0) {
                break;
            }

            const labels = nodes.map((node) => ({
                id: node.id,
                name: node.name,
                ...(node.color != null && { color: node.color }),
                ...(node.description != null && { description: node.description }),
                updatedAt: node.updatedAt,
                ...(node.createdAt != null && { createdAt: node.createdAt }),
                ...(node.team?.id != null && { teamId: node.team.id })
            }));

            await nango.batchSave(labels, 'IssueLabel');

            const firstLabel = labels[0];
            if (!highWaterMark && firstLabel) {
                highWaterMark = firstLabel.updatedAt;
            }

            hasNextPage = pageInfo.hasNextPage;
            endCursor = pageInfo.endCursor ?? undefined;

            if (!hasNextPage || !endCursor) {
                break;
            }
        }

        if (highWaterMark) {
            await nango.saveCheckpoint({
                updated_after: highWaterMark
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
