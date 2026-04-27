import { createSync } from 'nango';
import { z } from 'zod';

const WorkflowStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    position: z.number().optional(),
    teamId: z.string().optional(),
    teamName: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string(),
    cursor: z.string(),
    firstPageHighWaterMark: z.string()
});

const MetadataSchema = z.object({
    teamIds: z.array(z.string()).optional()
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        workflowStates: z.object({
            nodes: z
                .array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        color: z.string().optional(),
                        description: z.string().nullable().optional(),
                        type: z.string().optional(),
                        position: z.number().optional(),
                        team: z
                            .object({
                                id: z.string(),
                                name: z.string().optional()
                            })
                            .optional(),
                        createdAt: z.string().optional(),
                        updatedAt: z.string().optional()
                    })
                )
                .optional(),
            pageInfo: z
                .object({
                    hasNextPage: z.boolean(),
                    endCursor: z.string().optional()
                })
                .optional()
        })
    })
});

const sync = createSync({
    description: 'Sync Linear workflow states across teams.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        WorkflowState: WorkflowStateSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/workflow-states'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = parsedCheckpoint.success
            ? parsedCheckpoint.data
            : rawCheckpoint && typeof rawCheckpoint === 'object'
              ? {
                    updatedAfter: typeof rawCheckpoint['updatedAfter'] === 'string' ? rawCheckpoint['updatedAfter'] : '',
                    cursor: typeof rawCheckpoint['cursor'] === 'string' ? rawCheckpoint['cursor'] : '',
                    firstPageHighWaterMark: typeof rawCheckpoint['firstPageHighWaterMark'] === 'string' ? rawCheckpoint['firstPageHighWaterMark'] : ''
                }
              : { updatedAfter: '', cursor: '', firstPageHighWaterMark: '' };

        const connection = await nango.getConnection();
        const rawMetadata = connection && typeof connection === 'object' && 'metadata' in connection ? connection['metadata'] : undefined;
        const parsedMetadata = MetadataSchema.safeParse(rawMetadata);
        const metadata = parsedMetadata.success ? parsedMetadata.data : undefined;

        const resumedFromLegacyPartialCheckpoint = Boolean(checkpoint.cursor) && !checkpoint.firstPageHighWaterMark;
        const updatedAfter = resumedFromLegacyPartialCheckpoint ? '' : checkpoint.updatedAfter;

        let cursor = resumedFromLegacyPartialCheckpoint ? undefined : checkpoint.cursor || undefined;
        let hasNextPage = true;
        let firstPageHighWaterMark = checkpoint.firstPageHighWaterMark;

        while (hasNextPage) {
            const filter = {
                ...(updatedAfter ? { updatedAt: { gte: updatedAfter } } : {}),
                ...(metadata?.teamIds && metadata.teamIds.length > 0 ? { team: { id: { in: metadata.teamIds } } } : {})
            };

            const variables = {
                first: 100,
                orderBy: 'updatedAt',
                ...(cursor ? { after: cursor } : {}),
                ...(Object.keys(filter).length > 0 ? { filter } : {})
            };

            // https://linear.app/developers/api/workflow-states
            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: `
                        query WorkflowStates($first: Int!, $after: String, $filter: WorkflowStateFilter, $orderBy: PaginationOrderBy) {
                            workflowStates(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
                                nodes {
                                    id
                                    name
                                    color
                                    description
                                    type
                                    position
                                    team {
                                        id
                                        name
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
                    `,
                    variables
                },
                retries: 3
            });

            const parsed = GraphQLResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Invalid workflow states response: ${parsed.error.message}`);
            }

            const nodes = parsed.data.data.workflowStates.nodes;
            const pageInfo = parsed.data.data.workflowStates.pageInfo;

            if (!Array.isArray(nodes)) {
                throw new Error('Invalid workflow states response: nodes is missing or not an array');
            }

            if (nodes.length === 0) {
                break;
            }

            const workflowStates = nodes.map((node) => ({
                id: node.id,
                name: node.name,
                ...(node.color != null && { color: node.color }),
                ...(node.description != null && { description: node.description }),
                ...(node.type != null && { type: node.type }),
                ...(node.position != null && { position: node.position }),
                ...(node.team != null && { teamId: node.team.id }),
                ...(node.team?.name != null && { teamName: node.team.name }),
                ...(node.createdAt != null && { createdAt: node.createdAt }),
                ...(node.updatedAt != null && { updatedAt: node.updatedAt })
            }));

            await nango.batchSave(workflowStates, 'WorkflowState');

            const firstRecord = workflowStates[0];
            if (!firstPageHighWaterMark && firstRecord?.updatedAt) {
                firstPageHighWaterMark = firstRecord.updatedAt;
            }

            if (!pageInfo || !pageInfo.hasNextPage || !pageInfo.endCursor) {
                hasNextPage = false;
                break;
            }

            cursor = pageInfo.endCursor;
            await nango.saveCheckpoint({
                updatedAfter,
                cursor,
                firstPageHighWaterMark
            });
        }

        if (firstPageHighWaterMark) {
            await nango.saveCheckpoint({
                updatedAfter: firstPageHighWaterMark,
                cursor: '',
                firstPageHighWaterMark: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
