import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    teamId: z.string().optional()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

const ProviderCycleNodeSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    number: z.number(),
    startsAt: z.string(),
    endsAt: z.string(),
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

const CycleSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    number: z.number(),
    startsAt: z.string(),
    endsAt: z.string(),
    teamId: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().optional(),
    archivedAt: z.string().optional()
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

const CYCLES_QUERY = `
query Cycles($first: Int, $after: String, $filter: CycleFilter, $orderBy: PaginationOrderBy) {
    cycles(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
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
}`;

const sync = createSync({
    description: 'Sync Linear cycles for planning and iteration tracking.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/cycles' }],
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Cycle: CycleSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const metadata = await nango.getMetadata();

        const filter: Record<string, unknown> = {};
        if (checkpoint?.['updatedAfter']) {
            filter['updatedAt'] = { gte: checkpoint['updatedAfter'] };
        }
        if (metadata?.['teamId']) {
            filter['team'] = { id: { eq: metadata['teamId'] } };
        }

        let hasNextPage = true;
        let endCursor: string | undefined;
        let highestUpdatedAt: string | undefined;

        while (hasNextPage) {
            const variables: Record<string, unknown> = {
                first: 100,
                orderBy: 'updatedAt'
            };
            if (endCursor) {
                variables['after'] = endCursor;
            }
            if (Object.keys(filter).length > 0) {
                variables['filter'] = filter;
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

            const cycles = [];
            for (const rawNode of nodes) {
                const node = ProviderCycleNodeSchema.parse(rawNode);
                cycles.push({
                    id: node.id,
                    ...(node.name != null && { name: node.name }),
                    number: node.number,
                    startsAt: node.startsAt,
                    endsAt: node.endsAt,
                    ...(node.team?.id != null && { teamId: node.team.id }),
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                    ...(node.completedAt != null && { completedAt: node.completedAt }),
                    ...(node.archivedAt != null && { archivedAt: node.archivedAt })
                });
            }

            if (cycles.length > 0) {
                await nango.batchSave(cycles, 'Cycle');
                if (!highestUpdatedAt) {
                    const firstCycle = cycles[0];
                    if (firstCycle) {
                        highestUpdatedAt = firstCycle.updatedAt;
                    }
                }
            }

            hasNextPage = pageInfo.hasNextPage;
            endCursor = pageInfo.endCursor ?? undefined;
            if (!hasNextPage || !endCursor) {
                break;
            }
        }

        if (highestUpdatedAt) {
            await nango.saveCheckpoint({ updatedAfter: highestUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
