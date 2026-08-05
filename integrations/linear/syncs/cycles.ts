import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    teamId: z.string().optional()
});

const ProviderCycleNodeSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    number: z.number(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
    team: z
        .object({
            id: z.string()
        })
        .optional()
        .nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().optional().nullable(),
    archivedAt: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            cycles: z.object({
                nodes: z.array(ProviderCycleNodeSchema),
                pageInfo: z.object({
                    hasNextPage: z.boolean(),
                    endCursor: z.string().nullable()
                })
            })
        })
        .optional()
        .nullable(),
    errors: z.array(z.unknown()).optional()
});

const CycleSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    number: z.number(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    teamId: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().optional(),
    archivedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

// Shape persisted by version 1.0.1 of this sync, kept so existing connections can be migrated in place.
const LegacyCheckpointSchema = z.object({
    updatedAfter: z.string()
});

const CYCLES_QUERY = `
query Cycles($first: Int!, $after: String, $includeArchived: Boolean, $filter: CycleFilter) {
    cycles(first: $first, after: $after, includeArchived: $includeArchived, filter: $filter, orderBy: updatedAt) {
        nodes {
            id
            name
            number
            startsAt
            endsAt
            team {
                id
            }
            createdAt
            updatedAt
            completedAt
            archivedAt
        }
        pageInfo {
            hasNextPage
            endCursor
        }
    }
}
`;

const sync = createSync({
    description: 'Sync Linear cycles for planning and iteration tracking.',
    version: '1.0.3',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['read'],
    endpoints: [{ method: 'GET', path: '/syncs/cycles' }],
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Cycle: CycleSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointRaw ?? { updated_after: '', cursor: '' });

        let checkpointData: z.infer<typeof CheckpointSchema>;
        if (parsedCheckpoint.success) {
            checkpointData = parsedCheckpoint.data;
        } else {
            // Migrate the legacy `{ updatedAfter }` checkpoint persisted by 1.0.1 instead of failing the run.
            const legacyCheckpoint = LegacyCheckpointSchema.safeParse(checkpointRaw);
            if (!legacyCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            checkpointData = { updated_after: legacyCheckpoint.data.updatedAfter, cursor: '' };
        }

        const metadata = await nango.getMetadata();

        const updatedAfter = checkpointData.updated_after.length > 0 ? checkpointData.updated_after : undefined;

        let hasNextPage = true;
        let endCursor = checkpointData.cursor.length > 0 ? checkpointData.cursor : undefined;
        let firstUpdatedAt: string | undefined;

        interface GraphQLVariables {
            first: number;
            includeArchived: boolean;
            after?: string;
            filter?: { updatedAt?: { gte: string }; team?: { id: { eq: string } } };
        }

        while (hasNextPage) {
            const variables: GraphQLVariables = {
                first: 100,
                includeArchived: true
            };
            const filter: NonNullable<GraphQLVariables['filter']> = {};
            if (updatedAfter) {
                filter.updatedAt = { gte: updatedAfter };
            }
            if (metadata?.['teamId']) {
                filter.team = { id: { eq: metadata['teamId'] } };
            }
            if (Object.keys(filter).length > 0) {
                variables.filter = filter;
            }
            if (endCursor) {
                variables.after = endCursor;
            }

            // https://linear.app/developers
            const response = await nango.post({
                endpoint: '/graphql',
                data: {
                    query: CYCLES_QUERY,
                    variables
                },
                retries: 3
            });

            const parsed = ProviderResponseSchema.parse(response.data);
            if (parsed.errors && parsed.errors.length > 0) {
                throw new Error(`GraphQL errors: ${JSON.stringify(parsed.errors)}`);
            }
            if (!parsed.data || !parsed.data.cycles) {
                throw new Error('Missing cycles data in GraphQL response');
            }

            const nodes = parsed.data.cycles.nodes;
            const pageInfo = parsed.data.cycles.pageInfo;

            const firstNode = nodes[0];
            if (firstNode && firstUpdatedAt === undefined) {
                firstUpdatedAt = firstNode.updatedAt;
            }

            const cycles = [];
            for (const rawNode of nodes) {
                const node = ProviderCycleNodeSchema.parse(rawNode);
                cycles.push({
                    id: node.id,
                    ...(node.name != null && { name: node.name }),
                    number: node.number,
                    ...(node.startsAt != null && { startsAt: node.startsAt }),
                    ...(node.endsAt != null && { endsAt: node.endsAt }),
                    ...(node.team?.id != null && { teamId: node.team.id }),
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                    ...(node.completedAt != null && { completedAt: node.completedAt }),
                    ...(node.archivedAt != null && { archivedAt: node.archivedAt })
                });
            }

            if (cycles.length > 0) {
                await nango.batchSave(cycles, 'Cycle');
            }

            hasNextPage = pageInfo.hasNextPage;
            endCursor = pageInfo.endCursor ?? undefined;
            if (hasNextPage && endCursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    cursor: endCursor
                });
            }
            if (!hasNextPage || !endCursor) {
                break;
            }
        }

        if (firstUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: firstUpdatedAt, cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
