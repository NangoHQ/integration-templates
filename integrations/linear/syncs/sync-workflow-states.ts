import { createSync } from 'nango';
import { z } from 'zod';

const WorkflowStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.union([
        z.literal('triage'),
        z.literal('backlog'),
        z.literal('unstarted'),
        z.literal('started'),
        z.literal('completed'),
        z.literal('canceled'),
        z.literal('duplicate')
    ]),
    color: z.string(),
    position: z.number(),
    description: z.union([z.string(), z.null()]),
    team_id: z.string(),
    team_key: z.union([z.string(), z.null()]),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const MetadataSchema = z.object({
    team_id: z.string().optional()
});

const WorkflowStateNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.union([
        z.literal('triage'),
        z.literal('backlog'),
        z.literal('unstarted'),
        z.literal('started'),
        z.literal('completed'),
        z.literal('canceled'),
        z.literal('duplicate')
    ]),
    color: z.string(),
    position: z.number(),
    description: z.union([z.string(), z.null()]).optional(),
    team: z
        .object({
            id: z.string(),
            key: z.union([z.string(), z.null()]).optional()
        })
        .optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.union([z.string(), z.null()]).optional()
});

const WorkflowStatesResponseSchema = z.object({
    data: z
        .object({
            workflowStates: z.object({
                nodes: z.array(WorkflowStateNodeSchema),
                pageInfo: z.object({
                    hasNextPage: z.boolean(),
                    endCursor: z.union([z.string(), z.null()]).optional()
                })
            })
        })
        .optional()
});

const sync = createSync({
    description: 'Sync Linear workflow states across teams',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        WorkflowState: WorkflowStateSchema
    },
    endpoints: [
        {
            path: '/syncs/sync-workflow-states',
            method: 'POST'
        }
    ],
    scopes: ['read'],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const metadata = await nango.getMetadata();

        const pageSize = 50;
        let updatedAfter = checkpoint?.updated_after || '';
        let cursor = checkpoint?.cursor || '';
        let hasMorePages = true;

        while (hasMorePages) {
            const filterParts: string[] = [];
            if (metadata?.team_id) {
                filterParts.push(`team: { id: { eq: "${metadata.team_id}" } }`);
            }
            if (updatedAfter) {
                filterParts.push(`updatedAt: { gt: "${updatedAfter}" }`);
            }
            const filterArg = filterParts.length > 0 ? `filter: { ${filterParts.join(', ')} }` : '';
            const afterArg = cursor ? `after: "${cursor}"` : '';

            const query = `
                query WorkflowStates {
                    workflowStates(
                        ${filterArg}
                        ${afterArg}
                        first: ${pageSize}
                        orderBy: updatedAt
                    ) {
                        nodes {
                            id
                            name
                            type
                            color
                            position
                            description
                            team {
                                id
                                key
                            }
                            createdAt
                            updatedAt
                            archivedAt
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            `;

            // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
            const response = await nango.post({
                endpoint: '/graphql',
                data: { query },
                retries: 3
            });

            const parsed = WorkflowStatesResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Linear workflow states response did not match the expected schema: ${parsed.error.message}`);
            }

            const workflowStatesData = parsed.data.data?.workflowStates;
            if (!workflowStatesData) {
                throw new Error('Missing workflowStates data from Linear API');
            }

            const nodes = workflowStatesData.nodes;
            const pageInfo = workflowStatesData.pageInfo;

            if (nodes.length === 0) {
                await nango.saveCheckpoint({ updated_after: updatedAfter || '', cursor: '' });
                hasMorePages = false;
                break;
            }

            const records = nodes.map((node) => ({
                id: node.id,
                name: node.name,
                type: node.type,
                color: node.color,
                position: node.position,
                description: node.description ?? null,
                team_id: node.team?.id ?? '',
                team_key: node.team?.key ?? null,
                created_at: node.createdAt,
                updated_at: node.updatedAt,
                archived_at: node.archivedAt ?? null
            }));

            await nango.batchSave(records, 'WorkflowState');

            const hasNextPage = pageInfo.hasNextPage;
            const endCursor = pageInfo.endCursor;

            if (hasNextPage && endCursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    cursor: endCursor
                });
                cursor = endCursor;
            } else {
                const lastRecord = records[records.length - 1];
                if (lastRecord) {
                    updatedAfter = lastRecord.updated_at;
                    cursor = '';
                    await nango.saveCheckpoint({
                        updated_after: updatedAfter,
                        cursor: ''
                    });
                }
                hasMorePages = false;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
