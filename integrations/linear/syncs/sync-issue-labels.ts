import { createSync } from 'nango';
import { z } from 'zod';

const IssueLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    description: z.union([z.string(), z.null()]),
    teamId: z.union([z.string(), z.null()]),
    createdAt: z.string(),
    updatedAt: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const IssueLabelNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    description: z.union([z.string(), z.null()]).optional(),
    team: z
        .union([
            z.object({
                id: z.string()
            }),
            z.null()
        ])
        .optional(),
    createdAt: z.string(),
    updatedAt: z.string()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.union([z.string(), z.null()]).optional()
});

const IssueLabelsConnectionSchema = z.object({
    nodes: z.array(IssueLabelNodeSchema),
    pageInfo: PageInfoSchema
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            issueLabels: IssueLabelsConnectionSchema
        })
        .optional()
});

const MetadataSchema = z.object({
    teamId: z.string().optional()
});

const sync = createSync({
    description: 'Sync Linear issue labels across teams',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        IssueLabel: IssueLabelSchema
    },
    endpoints: [
        {
            path: '/syncs/sync-issue-labels',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after || '';
        let cursor: string | undefined = checkpoint?.cursor || undefined;

        const connection = await nango.getConnection();
        const metadata = 'metadata' in connection ? connection.metadata : undefined;
        const validatedMetadata = MetadataSchema.safeParse(metadata);
        const teamId = validatedMetadata.success ? validatedMetadata.data.teamId : undefined;

        // https://linear.app/developers/pagination
        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const buildFilter = (): Record<string, unknown> | undefined => {
            const filter: Record<string, unknown> = {};

            if (teamId) {
                filter['team'] = { id: { eq: teamId } };
            }

            if (updatedAfter) {
                filter['updatedAt'] = { gt: updatedAfter };
            }

            return Object.keys(filter).length > 0 ? filter : undefined;
        };

        const query = `
            query IssueLabels($after: String, $first: Int, $filter: IssueLabelFilter) {
                issueLabels(first: $first, after: $after, filter: $filter, orderBy: updatedAt) {
                    nodes {
                        id
                        name
                        color
                        description
                        team {
                            id
                        }
                        createdAt
                        updatedAt
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        while (true) {
            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query,
                    variables: {
                        first: 100,
                        after: cursor,
                        filter: buildFilter()
                    }
                },
                retries: 3
            });

            const validated = GraphQLResponseSchema.safeParse(response.data);
            if (!validated.success) {
                const graphqlErrors = Array.isArray(response.data?.errors)
                    ? response.data.errors
                          .map((error: { message?: string }) => error.message)
                          .filter((message: string | undefined): message is string => Boolean(message))
                          .join('; ')
                    : undefined;

                const failureDetails = graphqlErrors || validated.error.message;
                throw new Error(`Linear issue labels response did not match the expected schema: ${failureDetails}`);
            }

            const issueLabelsConnection = validated.data.data?.issueLabels;
            if (!issueLabelsConnection) {
                throw new Error('Linear issue labels response did not include an issueLabels connection');
            }

            const nodes = issueLabelsConnection.nodes;
            const pageInfo = issueLabelsConnection.pageInfo;

            if (nodes.length === 0) {
                await nango.saveCheckpoint({ updated_after: updatedAfter, cursor: '' });
                break;
            }

            const labels = nodes.map((node) => ({
                id: node.id,
                name: node.name,
                color: node.color,
                description: node.description ?? null,
                teamId: node.team?.id ?? null,
                createdAt: node.createdAt,
                updatedAt: node.updatedAt
            }));

            await nango.batchSave(labels, 'IssueLabel');

            if (pageInfo.hasNextPage) {
                if (!pageInfo.endCursor) {
                    throw new Error('Linear issue labels pagination indicated more pages without an end cursor');
                }

                cursor = pageInfo.endCursor;
                await nango.saveCheckpoint({ updated_after: updatedAfter, cursor });
                continue;
            }

            const lastUpdatedAt = labels[labels.length - 1]?.updatedAt ?? updatedAfter;
            await nango.saveCheckpoint({ updated_after: lastUpdatedAt, cursor: '' });
            break;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
